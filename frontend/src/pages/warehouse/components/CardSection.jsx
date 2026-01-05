import { Paper, Box, Typography, Button } from "@mui/material";

const CardSection = ({
  title,
  headerColor = "#3e468a",
  actions = [],
  children,
  contentPadding = 2,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        position: "relative",

        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: headerColor,
        },
      }}
    >
      <Box
        sx={{
          p: 3,
          pb: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{
            background: headerColor,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {title}
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          {actions.map((action, idx) => (
            <Button
              key={idx}
              startIcon={action.startIcon}
              variant={action.variant || "contained"}
              onClick={action.onClick}
              sx={{
                fontSize: "14.5px",
                fontWeight: 540,
                borderRadius: 2,
                textTransform: "none",
                bgcolor: headerColor,
                px: 2,
                ...action.sx,
              }}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      </Box>

      <Box sx={{ p: contentPadding }}>{children}</Box>
    </Paper>
  );
};

export default CardSection;
