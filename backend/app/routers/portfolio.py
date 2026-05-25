from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.database import get_session
from backend.app.middleware.auth import require_auth
from backend.app.models import Portfolio, Holding, User
from backend.app.schemas import PortfolioDTO, HoldingDTO, PortfolioAnalyticsDTO
from backend.app.services import market_data_service
from backend.app.services.portfolio_analytics import calculate_analytics

router = APIRouter()


async def _get_or_create_portfolio(user: User, db: AsyncSession) -> Portfolio:
    result = await db.execute(select(Portfolio).where(Portfolio.user_id == user.id))
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        portfolio = Portfolio(user_id=user.id, cash_balance=100_000.0)
        db.add(portfolio)
        await db.commit()
        await db.refresh(portfolio)
    return portfolio


@router.get("/portfolio", response_model=PortfolioDTO)
async def get_portfolio(
    current_user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    portfolio = await _get_or_create_portfolio(current_user, db)
    result = await db.execute(select(Holding).where(Holding.portfolio_id == portfolio.id))
    holdings = result.scalars().all()
    return PortfolioDTO(
        id=portfolio.id,
        user_id=str(current_user.id),
        cash_balance=portfolio.cash_balance,
        holdings=[
            HoldingDTO(
                id=h.id, ticker=h.ticker, quantity=h.quantity,
                average_price=h.average_price, sector=h.sector,
                asset_class=h.asset_class,
            )
            for h in holdings
        ],
    )


@router.post("/portfolio/holdings", response_model=PortfolioDTO)
async def set_holdings(
    holdings_in: list[HoldingDTO],
    current_user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    portfolio = await _get_or_create_portfolio(current_user, db)

    existing = await db.execute(select(Holding).where(Holding.portfolio_id == portfolio.id))
    for h in existing.scalars().all():
        await db.delete(h)
    await db.commit()

    new_holdings = []
    for h_in in holdings_in:
        h = Holding(
            portfolio_id=portfolio.id,
            ticker=h_in.ticker,
            quantity=h_in.quantity,
            average_price=h_in.average_price,
            sector=h_in.sector,
            asset_class=h_in.asset_class,
        )
        db.add(h)
        new_holdings.append(h)
    await db.commit()

    return PortfolioDTO(
        id=portfolio.id,
        user_id=str(current_user.id),
        cash_balance=portfolio.cash_balance,
        holdings=[
            HoldingDTO(
                id=h.id, ticker=h.ticker, quantity=h.quantity,
                average_price=h.average_price, sector=h.sector,
                asset_class=h.asset_class,
            )
            for h in new_holdings
        ],
    )


@router.get("/portfolio/analytics", response_model=PortfolioAnalyticsDTO)
async def get_portfolio_analytics(
    current_user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    portfolio = await _get_or_create_portfolio(current_user, db)
    result = await db.execute(select(Holding).where(Holding.portfolio_id == portfolio.id))
    holdings = result.scalars().all()

    current_prices: dict[str, float] = {}
    for h in holdings:
        try:
            data = await market_data_service.get_ohlcv(symbol=h.ticker, timeframe="1d", limit=1)
            if not data.empty:
                current_prices[h.ticker] = float(data.iloc[-1]["close"])
        except Exception:
            pass

    # Pass market_data_service explicitly — avoids circular import in analytics module
    analytics = await calculate_analytics(holdings, current_prices, market_data_service)
    return PortfolioAnalyticsDTO(**analytics)
