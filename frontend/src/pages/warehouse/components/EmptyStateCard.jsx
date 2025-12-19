import { Box, Paper, Typography, Button } from "@mui/material";

const EmptyStateCard = ({
  title,
  description,
  buttonText,
  onButtonClick,
  headerColor = "error.main",
}) => {
  return (
    <Box p={4}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          position: "relative",
          overflow: "hidden",
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
        <Box textAlign="center">
          <Typography
            variant="h6"
            fontWeight={700}
            color={headerColor}
            gutterBottom
          >
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {description}
          </Typography>
          <Button
            onClick={onButtonClick}
            variant="contained"
            sx={{
              bgcolor: headerColor,
              "&:hover": { bgcolor: headerColor },
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: "none",
            }}
          >
            {buttonText}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default EmptyStateCard;
