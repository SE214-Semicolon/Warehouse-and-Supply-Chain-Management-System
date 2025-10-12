{
  "lenses": {
    "0": {
      "order": 0,
      "parts": {
        "0": {
          "position": {
            "x": 0,
            "y": 0,
            "colSpan": 6,
            "rowSpan": 4
          },
          "metadata": {
            "inputs": [
              {
                "name": "resourceId",
                "value": "/subscriptions/${subscription_id}/resourceGroups/${resource_group_name}/providers/Microsoft.Insights/components/${app_insights_name}"
              }
            ],
            "type": "Extension/AppInsightsExtension/PartType/AppMapGalPt",
            "settings": {},
            "asset_id": "/subscriptions/${subscription_id}/resourceGroups/${resource_group_name}/providers/Microsoft.Insights/components/${app_insights_name}"
          }
        },
        "1": {
          "position": {
            "x": 6,
            "y": 0,
            "colSpan": 6,
            "rowSpan": 4
          },
          "metadata": {
            "inputs": [
              {
                "name": "resourceId",
                "value": "/subscriptions/${subscription_id}/resourceGroups/${resource_group_name}/providers/Microsoft.Insights/components/${app_insights_name}"
              }
            ],
            "type": "Extension/AppInsightsExtension/PartType/FailuresLensPt",
            "settings": {},
            "asset_id": "/subscriptions/${subscription_id}/resourceGroups/${resource_group_name}/providers/Microsoft.Insights/components/${app_insights_name}"
          }
        },
        "2": {
          "position": {
            "x": 0,
            "y": 4,
            "colSpan": 6,
            "rowSpan": 4
          },
          "metadata": {
            "inputs": [
              {
                "name": "resourceId",
                "value": "/subscriptions/${subscription_id}/resourceGroups/${resource_group_name}/providers/Microsoft.Insights/components/${app_insights_name}"
              }
            ],
            "type": "Extension/AppInsightsExtension/PartType/PerformanceLensPt",
            "settings": {},
            "asset_id": "/subscriptions/${subscription_id}/resourceGroups/${resource_group_name}/providers/Microsoft.Insights/components/${app_insights_name}"
          }
        },
        "3": {
          "position": {
            "x": 6,
            "y": 4,
            "colSpan": 6,
            "rowSpan": 4
          },
          "metadata": {
            "inputs": [
              {
                "name": "resourceId",
                "value": "/subscriptions/${subscription_id}/resourceGroups/${resource_group_name}/providers/Microsoft.OperationalInsights/workspaces/${log_analytics_name}"
              }
            ],
            "type": "Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart",
            "settings": {
              "content": {
                "Query": "AppRequests\n| where TimeGenerated > ago(24h)\n| summarize RequestCount = count() by bin(TimeGenerated, 1h)\n| render timechart\n"
              }
            }
          }
        }
      }
    }
  },
  "metadata": {
    "model": {
      "timeRange": {
        "value": {
          "relative": {
            "duration": 24,
            "timeUnit": 1
          }
        },
        "type": "MsPortalFx.Composition.Configuration.ValueTypes.TimeRange"
      },
      "filterLocale": {
        "value": "en-us"
      },
      "filters": {
        "value": {
          "MsPortalFx_TimeRange": {
            "model": {
              "format": "utc",
              "granularity": "auto",
              "relative": "24h"
            },
            "displayCache": {
              "name": "UTC Time",
              "value": "Past 24 hours"
            },
            "filteredPartIds": ["0", "1", "2", "3"]
          }
        }
      }
    }
  }
}