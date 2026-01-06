import { Paper, Typography, Box } from "@mui/material";

const InfoCard = ({
  title = "Detail Information",
  subtitle = "Full details",
  headerColor = "#764ba2",
  leftFields = [],
  rightFields = [],
  gap = 7,
}) => {
  const InfoRow = ({ label, value }) => (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        transition: "all 0.18s ease",
        "&:hover": {
          bgcolor: "grey.100",
          transform: "translateY(-2px)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        },
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 2,
        mb: 1,
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        fontWeight={600}
        sx={{
          minWidth: "fit-content",
          maxWidth: "40%",
        }}
      >
        {label}
      </Typography>

      <Typography
        variant="body1"
        fontWeight={400}
        sx={{
          textAlign: "right",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          flex: 1,
        }}
      >
        {value ?? "-"}
      </Typography>
    </Box>
  );

  const InfoSection = ({ fields }) => (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {fields.map((f, idx) => (
        <InfoRow key={idx} label={f.label} value={f.value} />
      ))}
    </Box>
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, md: 4 },
        mb: 3,
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
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{
            background: headerColor,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            wordBreak: "break-word",
          }}
        >
          {title}
        </Typography>

        <Typography variant="body1" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <InfoSection fields={leftFields} />

        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              width: "1.5px",
              bgcolor: "divider",
              height: "100%",
            }}
          />
        </Box>

        <InfoSection fields={rightFields} />
      </Box>
    </Paper>
  );
};

export default InfoCard;
