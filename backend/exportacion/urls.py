from django.urls import path
from .views import ExportView, MetricsView, ImportView,ChartMetricsView

urlpatterns = [
    path("export/", ExportView.as_view(), name="exportacion-export"),
    path("metrics/", MetricsView.as_view(), name="exportacion-metrics"),
    path("metrics_charts/", ChartMetricsView.as_view(), name="exportacion-metrics-charts"),
    path("import/", ImportView.as_view(), name="exportacion-import"),
]
