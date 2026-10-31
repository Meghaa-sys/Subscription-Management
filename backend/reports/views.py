"""Thin report endpoints over reports/queries.py. Staff and admin only."""
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffOrAdmin
from billing.serializers import InvoiceListSerializer
from common.pagination import StandardPagination

from . import queries
from .serializers import (
    DateRangeSerializer,
    OverdueReportSerializer,
    RevenueMonthSerializer,
    StatusCountSerializer,
    SummarySerializer,
)

TAG = "reports"
DATE_PARAMS = [
    OpenApiParameter("date_from", str, description="YYYY-MM-DD"),
    OpenApiParameter("date_to", str, description="YYYY-MM-DD"),
]


class ReportView(APIView):
    permission_classes = [IsStaffOrAdmin]

    def date_range(self):
        serializer = DateRangeSerializer(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data


class SummaryView(ReportView):
    @extend_schema(
        tags=[TAG],
        summary="Dashboard summary",
        description=(
            "The dates filter revenue_collected by payment date, and outstanding and the overdue "
            "figures by invoice date. active_subscriptions, mrr and arr are always as of today."
        ),
        parameters=DATE_PARAMS,
        responses=SummarySerializer,
    )
    def get(self, request):
        return Response(SummarySerializer(queries.summary(**self.date_range())).data)


class RevenueView(ReportView):
    @extend_schema(
        tags=[TAG],
        summary="Revenue collected per month",
        parameters=DATE_PARAMS,
        responses=RevenueMonthSerializer(many=True),
    )
    def get(self, request):
        rows = queries.revenue_by_month(**self.date_range())
        return Response(RevenueMonthSerializer(rows, many=True).data)


class OverdueView(ReportView):
    @extend_schema(
        tags=[TAG],
        summary="Overdue ageing and invoices",
        parameters=DATE_PARAMS
        + [OpenApiParameter("page", int), OpenApiParameter("page_size", int)],
        responses=OverdueReportSerializer,
    )
    def get(self, request):
        dates = self.date_range()
        paginator = StandardPagination()
        invoices = (
            queries.overdue_invoices(**dates)
            .select_related("customer", "subscription")
            .order_by("due_date", "id")
        )
        page = paginator.paginate_queryset(invoices, request, view=self)
        response = paginator.get_paginated_response(InvoiceListSerializer(page, many=True).data)
        response.data = {"buckets": queries.overdue_buckets(**dates), **response.data}
        response.data["buckets"] = [
            {**bucket, "amount": str(bucket["amount"])} for bucket in response.data["buckets"]
        ]
        return response


class SubscriptionsByStatusView(ReportView):
    @extend_schema(
        tags=[TAG],
        summary="Subscription counts per status",
        description="The dates filter by subscription start date.",
        parameters=DATE_PARAMS,
        responses=StatusCountSerializer(many=True),
    )
    def get(self, request):
        return Response(queries.subscriptions_by_status(**self.date_range()))
