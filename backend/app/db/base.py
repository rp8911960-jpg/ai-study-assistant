# Import all the models so that Base.metadata can detect them
from app.db.database import Base # noqa
from app.models.user import User # noqa
from app.models.document import DB_Document # noqa
from app.models.exam import ExamSession, ExamQuestion # noqa
from app.models.activity import UserActivity # noqa
