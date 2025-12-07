import {
  Stack,
  Paper,
  Typography,
  Button,
  IconButton,
  Box,
} from "@mui/material";
import { ArrowBack, Edit } from "@mui/icons-material";

const DetailHeader = ({
  title,
  subtitleItems = [],
  statItems = [],
  onBack,
  onEdit,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        background: "#764ba2",
        color: "white",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        {onBack && (
          <IconButton
            onClick={onBack}
            size="medium"
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              color: "white",
              "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
            }}
          >
            <ArrowBack />
          </IconButton>
        )}

        <Box flex={1}>
          <Typography variant="h4" fontWeight={700}>
            {title}
          </Typography>

          {subtitleItems.length > 0 && (
            <Stack direction="row" spacing={2} sx={{ opacity: 0.9, mt: 0.5 }}>
              {subtitleItems.map((item) => (
                <Typography key={item.label} variant="body1">
                  {item.label}: {item.value}
                </Typography>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pt: 2,
          borderTop: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {statItems.length > 0 && (
          <Stack direction="row" spacing={4}>
            {statItems.map((item) => (
              <Box key={item.label} sx={{ textAlign: "center" }}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {item.label}
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}

        <Button
          startIcon={<Edit />}
          variant="contained"
          onClick={onEdit}
          sx={{
            bgcolor: "rgba(255,255,255,0.95)",
            color: "primary.main",
            borderRadius: 2,
            textTransform: "none",
            fontSize: "16px",
            fontWeight: 600,
            px: 3,
            "&:hover": {
              bgcolor: "white",
              transform: "translateY(-2px)",
              boxShadow: 4,
            },
            transition: "all 0.2s",
          }}
        >
          Edit
        </Button>
      </Box>
    </Paper>
  );
};

export default DetailHeader;
