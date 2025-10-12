import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Box, Typography } from "@mui/material";

const RevenuePieChart = ({ data }) => (
  <>
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={30}
          outerRadius={60}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>

    <Box mt={1}>
      {data.map((region, i) => (
        <Box key={i} display="flex" alignItems="center" mb={0.5}>
          <Box
            width={10}
            height={10}
            borderRadius="50%"
            bgcolor={region.color}
            mr={1}
          />
          <Typography variant="caption">
            {region.name} - {region.value}%
          </Typography>
        </Box>
      ))}
    </Box>
  </>
);

export default RevenuePieChart;
