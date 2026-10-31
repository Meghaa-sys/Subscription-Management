import logging

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import close_old_connections

from billing.services import run_billing
from subscriptions.services import close_expired

logger = logging.getLogger(__name__)


def billing_job():
    # This process lives for days and Neon drops idle connections.
    close_old_connections()
    logger.info("Billing finished: %s", run_billing())
    close_old_connections()


def close_expired_job():
    close_old_connections()
    logger.info("Closed %s expired subscription(s)", close_expired())
    close_old_connections()


class Command(BaseCommand):
    help = "Run daily jobs: billing at 00:05 and close_expired at 00:10 (Asia/Kolkata)."

    def handle(self, *args, **options):
        scheduler = BlockingScheduler(timezone=settings.TIME_ZONE)
        common = {"coalesce": True, "max_instances": 1, "misfire_grace_time": 3600}
        scheduler.add_job(
            billing_job, CronTrigger(hour=0, minute=5, timezone=settings.TIME_ZONE), id="run_billing", **common
        )
        scheduler.add_job(
            close_expired_job,
            CronTrigger(hour=0, minute=10, timezone=settings.TIME_ZONE),
            id="close_expired",
            **common,
        )
        self.stdout.write(self.style.SUCCESS("Scheduler started. Press Ctrl+C to stop."))
        try:
            scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            self.stdout.write("Scheduler stopped.")
