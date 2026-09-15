"""Models package — import all models here so Alembic and SQLAlchemy discover them."""

from app.models.location import Location
from app.models.weather import WeatherData, Forecast
from app.models.alert import Alert, WeatherAlert, AlertPreference
from app.models.advisory import Advisory
from app.models.chat import ChatSession, ChatMessage, ChatHistory
from app.models.user import User, UserLocation, DeviceToken
from app.models.shelter import Shelter

__all__ = [
    "Location",
    "WeatherData",
    "Forecast",
    "Alert",
    "WeatherAlert",
    "AlertPreference",
    "Advisory",
    "ChatSession",
    "ChatMessage",
    "ChatHistory",
    "User",
    "UserLocation",
    "DeviceToken",
    "Shelter",
]
