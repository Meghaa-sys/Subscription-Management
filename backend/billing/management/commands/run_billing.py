from datetime import date

from django.core.management.base import BaseCommand, CommandError

from billing.services import run_billing


class Command(BaseCommand):
    help = "Generate invoices for every subscription due. Safe to run repeatedly."

    def add_arguments(self, parser):
        parser.add_argument("--date", help="Bill as of this date (YYYY-MM-DD). Default: today.")

    def handle(self, *args, **options):
        today = None
        if options["date"]:
            try:
                today = date.fromisoformat(options["date"])
            except ValueError:
                raise CommandError("--date must look like YYYY-MM-DD.")

        result = run_billing(today)
        self.stdout.write(
            self.style.SUCCESS(
                "Created {created}, skipped {skipped}, failed {failed}, "
                "subscriptions processed {subscriptions_processed}.".format(**result)
            )
        )
