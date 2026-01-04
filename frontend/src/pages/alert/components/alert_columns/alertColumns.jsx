import { Chip, Tooltip, Box, Typography } from "@mui/material";
import {
  MarkEmailRead as ReadIcon,
  MarkEmailUnread as UnreadIcon,
} from "@mui/icons-material";
import { formatDateTime } from "@/utils/formatDate";

export const getAlertColumns = (onMarkRead) => [
  { id: "stt", label: "No", width: 50, align: "center", filterable: false },

  {
    id: "statusLabel",
    label: "Status",
    align: "center",
    width: 120,
    filterable: true,
    render: (val, row) => {
      const isUnread = val === "Unread";

      return (
        <Tooltip title={isUnread ? "Click to mark as read" : "Already read"}>
          <Chip
            icon={
              isUnread ? <UnreadIcon fontSize="small" /> : <ReadIcon fontSize="small" />
            }
            label={val}
            size="small"
            color={isUnread ? "primary" : "success"}
            variant={isUnread ? "filled" : "outlined"}
            onClick={isUnread ? () => onMarkRead(row) : undefined}
            sx={{
              fontWeight: isUnread ? "bold" : "normal",
              minWidth: 85,
              cursor: isUnread ? "pointer" : "default",
              "&:hover": isUnread ? { transform: "scale(1.05)", boxShadow: 1 } : {},
            }}
          />
        </Tooltip>
      );
    },
  },

  {
    id: "severity",
    label: "Severity",
    filterable: true,
    render: (val) => {
      const colors = {
        CRITICAL: "error",
        WARNING: "warning",
        INFO: "info",
      };
      return (
        <Chip
          label={val}
          color={colors[val] || "default"}
          size="small"
          variant="filled"
          sx={{ fontWeight: "bold", minWidth: 80, fontSize: "0.75rem" }}
        />
      );
    },
  },

  {
    id: "type",
    label: "Type",
    filterable: true,
    render: (val) => (
      <Chip
        label={val?.replace(/_/g, " ")}
        variant="outlined"
        size="small"
        sx={{ borderColor: "#e0e0e0", color: "#555", fontSize: "0.75rem" }}
      />
    ),
  },

  {
    id: "message",
    label: "Message",
    align: "left",
    minWidth: 400,
    render: (val, row) => (
      <Box>
        <Typography
          variant="body2"
          sx={{
            color: row.isRead ? "text.secondary" : "text.primary",
            fontWeight: row.isRead ? 500 : 650,
          }}
        >
          {val}
        </Typography>
        {row.relatedEntity && (
          <Typography variant="caption" color="primary.main" sx={{ opacity: 0.8 }}>
            Ref: {row.relatedEntity.type}
          </Typography>
        )}
      </Box>
    ),
  },

  {
    id: "createdAt",
    label: "Created At",
    minWidth: 150,
    render: (val) => <Typography variant="body1">{formatDateTime(val)}</Typography>,
  },
];
