from django.core.management.base import BaseCommand

from subscriptions.services import close_expired


class Command(BaseCommand):
    help = "Close active or paused subscriptions past expiry whose plan has auto_close on."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(f"Closed {close_expired()} subscription(s)."))
