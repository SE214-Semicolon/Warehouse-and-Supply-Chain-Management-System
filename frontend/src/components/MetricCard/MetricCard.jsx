import React from "react";
import { Box, Card, CardContent, Typography, Chip } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

const MetricCard = ({
  title,
  value,
  change,
  bg_color = "success",
  subtitle = "Last month",
  icon,
}) => {
  const ChangeIcon =
    icon ?? (parseFloat(change) >= 0 ? TrendingUpIcon : TrendingDownIcon);

  return (
    <Card sx={{ flex: "1 1 200px" }}>
      <CardContent sx={{ p: 2 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={0.5}
        >
          <Typography variant="body2" color="text.secondary" noWrap>
            {title}
          </Typography>
          <Chip
            icon={<ChangeIcon sx={{ fontSize: 14, color: "white" }} />}
            label={change}
            size="small"
            sx={{
              height: 20,
              color: "white",
              backgroundColor: (theme) => theme.palette[bg_color].main,
              "& .MuiChip-icon": {
                color: "white",
              },
            }}
          />
        </Box>
        <Typography variant="h6" fontWeight="bold" mb={0.5}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
