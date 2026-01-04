import { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Avatar,
  Typography,
  Badge,
  Tooltip,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AlertService from "@/services/alert.service";

export default function Header({ height = 60 }) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await AlertService.getUnreadCount();
        if (res && typeof res.unreadCount === "number") {
          setUnreadCount(res.unreadCount);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchUnreadCount();

    // tự động cập nhật mỗi nửa phút
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      component="header"
      sx={{
        width: "100%",
        height: height,
        bgcolor: "#ffffff",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        borderBottom: "1px solid #e0e0e0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 3,
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography
          variant="h6"
          sx={{
            color: "primary.main",
            fontWeight: "bold",
            userSelect: "none",
            cursor: "pointer",
            lineHeight: 1,
          }}
          onClick={() => navigate("/")}
        >
          WSCMS
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} alignItems="center">
        <Tooltip title="Alerts">
          <IconButton onClick={() => navigate("/alerts")} size="large">
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <NotificationsIcon color="action" />
            </Badge>
          </IconButton>
        </Tooltip>

        <Avatar
          alt="User"
          src="/path/to/avatar.jpg"
          sx={{
            width: 36,
            height: 36,
            cursor: "pointer",
            border: "1px solid #e0e0e0",
            transition: "0.2s",
            "&:hover": {
              borderColor: "primary.main",
            },
          }}
          onClick={() => navigate("/profile")}
        />
      </Stack>
    </Box>
  );
}
