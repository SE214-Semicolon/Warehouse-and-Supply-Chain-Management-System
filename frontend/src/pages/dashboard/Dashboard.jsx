import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
} from "@mui/material";
import TrendingDownIcon from "@mui/icons-material/TrendingDown"
import MoreVertIcon from "@mui/icons-material/MoreVert";
import MetricCard from "@/components/MetricCard";
import ChartContainer from "@/components/ChartContainer";
import MonthlyOrderChart from "@/components/MonthlyOrderChart";
import RevenuePieChart from "@/components/RevenuePieChart";
import DeliveryBarChart from "@/components/DeliveryBarChart";

const Dashboard = () => {
  const monthlyData = [
    { month: 0, series1: 9, series2: 8 },
    { month: 1, series1: 3, series2: 2 },
    { month: 2, series1: 6, series2: 4 },
    { month: 3, series1: 10, series2: 3 },
    { month: 4, series1: 3, series2: 2 },
    { month: 5, series1: 0, series2: 3 },
    { month: 6, series1: 9, series2: 2 },
    { month: 7, series1: 0, series2: 0 },
    { month: 8, series1: 7, series2: 3 },
    { month: 9, series1: 12, series2: 9 },
  ];

  const deliveryData = [
    { day: 0, rate: 3 },
    { day: 1, rate: 6 },
    { day: 2, rate: 5 },
    { day: 3, rate: 8 },
    { day: 4, rate: 1 },
    { day: 5, rate: 3 },
    { day: 6, rate: 6 },
    { day: 7, rate: 1 },
    { day: 8, rate: 6 },
    { day: 9, rate: 0 },
    { day: 10, rate: 1 },
    { day: 11, rate: 6 },
  ];

  const regionData = [
    { name: "North America", value: 35, color: "#7c3aed" },
    { name: "Asia", value: 25, color: "#f97316" },
    { name: "Europe", value: 10, color: "#1e3a8a" },
    { name: "Others", value: 5, color: "#4338ca" },
  ];

  const suppliers = [
    { name: "Jane Cooper", email: "jane.cooper@example.com" },
    { name: "Esther Howard", email: "esther.howard@example.com" },
    { name: "Jenny Wilson", email: "jenny.wilson@example.com" },
    { name: "Robert Fox", email: "robert.fox@example.com" },
    { name: "Albert Flores", email: "albert.flores@example.com" },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100vw",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          justifyContent: "space-between",
          maxWidth: "100%",
        }}
      >
        <MetricCard
          title="Average delivery time"
          value="4.2 Days"
          change="18%"
        />
        <MetricCard
          title="Total revenue"
          value="$1.5M"
          change="18%"
          bg_color="error"
          icon={TrendingDownIcon}
        />
        <MetricCard title="Total orders" value="8k" change="16%" />
        <MetricCard title="On-Time delivery" value="92%" change="18%" />
      </Box>

      {/* Charts Section */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          justifyContent: "space-between",
          maxWidth: "100%",
        }}
      >
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <ChartContainer title="Monthly order">
            <MonthlyOrderChart data={monthlyData} />
          </ChartContainer>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ChartContainer title="Revenue by region" showDropdown={false}>
            <RevenuePieChart data={regionData} />
          </ChartContainer>
        </Box>
      </Box>

      {/* Delivery Rate and Suppliers Section */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          justifyContent: "space-between",
          maxWidth: "100%",
        }}
      >
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <ChartContainer title="On-Time delivery rate">
            <DeliveryBarChart data={deliveryData} />
          </ChartContainer>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">Top 5 Suppliers</Typography>
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{ cursor: "pointer" }}
                >
                  View all
                </Typography>
              </Box>
              {suppliers.map((supplier, i) => (
                <Box
                  key={i}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={1.5}
                >
                  <Box display="flex" alignItems="center">
                    <Avatar
                      sx={{ width: 32, height: 32, mr: 1, bgcolor: "grey.300" }}
                    >
                      {supplier.name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {supplier.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {supplier.email}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small">
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
