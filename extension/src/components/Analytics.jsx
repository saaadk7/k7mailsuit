import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Paper, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Divider
} from '@mui/material';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend
);

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    fetchAnalyticsData(timeRange);
  }, [timeRange]);

  const fetchAnalyticsData = (range) => {
    setLoading(true);
    // In a real implementation, this would call your backend API
    // For now, we'll use mock data
    setTimeout(() => {
      // Generate mock data based on selected time range
      const data = generateMockData(range);
      setAnalyticsData(data);
      setLoading(false);
    }, 1000);
  };

  const generateMockData = (range) => {
    let labels = [];
    let emailsSent = [];
    let emailsOpened = [];
    let linksClicked = [];
    
    // Generate data based on selected time range
    if (range === 'week') {
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      emailsSent = [5, 8, 12, 7, 10, 3, 2];
      emailsOpened = [3, 5, 8, 4, 7, 1, 0];
      linksClicked = [1, 2, 4, 2, 3, 0, 0];
    } else if (range === 'month') {
      // Generate 4 weeks of data
      labels = Array.from({ length: 4 }, (_, i) => `Week ${i + 1}`);
      emailsSent = [25, 32, 28, 35];
      emailsOpened = [18, 22, 15, 24];
      linksClicked = [8, 12, 7, 14];
    } else if (range === 'year') {
      // Generate 12 months of data
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      emailsSent = [95, 120, 150, 130, 140, 160, 170, 165, 155, 180, 190, 210];
      emailsOpened = [65, 85, 100, 90, 95, 110, 120, 115, 105, 125, 130, 145];
      linksClicked = [30, 40, 50, 45, 48, 55, 60, 58, 52, 65, 70, 75];
    }
    
    // Calculate totals and rates
    const totalSent = emailsSent.reduce((sum, val) => sum + val, 0);
    const totalOpened = emailsOpened.reduce((sum, val) => sum + val, 0);
    const totalClicked = linksClicked.reduce((sum, val) => sum + val, 0);
    
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    
    return {
      labels,
      emailsSent,
      emailsOpened,
      linksClicked,
      totalSent,
      totalOpened,
      totalClicked,
      openRate,
      clickRate
    };
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  if (loading || !analyticsData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Prepare chart data
  const lineChartData = {
    labels: analyticsData.labels,
    datasets: [
      {
        label: 'Emails Sent',
        data: analyticsData.emailsSent,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4
      },
      {
        label: 'Emails Opened',
        data: analyticsData.emailsOpened,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4
      },
      {
        label: 'Links Clicked',
        data: analyticsData.linksClicked,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4
      }
    ]
  };

  const pieChartData = {
    labels: ['Opened', 'Not Opened'],
    datasets: [
      {
        data: [
          analyticsData.totalOpened,
          analyticsData.totalSent - analyticsData.totalOpened
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(211, 211, 211, 0.8)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(211, 211, 211, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Email Analytics</Typography>
        <FormControl sx={{ minWidth: 120 }} size="small">
          <InputLabel id="time-range-label">Time Range</InputLabel>
          <Select
            labelId="time-range-label"
            id="time-range-select"
            value={timeRange}
            label="Time Range"
            onChange={handleTimeRangeChange}
          >
            <MenuItem value="week">Last Week</MenuItem>
            <MenuItem value="month">Last Month</MenuItem>
            <MenuItem value="year">Last Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <Typography variant="h6" color="primary">{analyticsData.totalSent}</Typography>
            <Typography variant="body2" color="textSecondary">Emails Sent</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <Typography variant="h6" color="secondary">
              {analyticsData.openRate.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="textSecondary">Open Rate</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <Typography variant="h6" color="error">
              {analyticsData.clickRate.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="textSecondary">Click Rate</Typography>
          </Paper>
        </Grid>

        {/* Line Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Email Activity Over Time</Typography>
            <Box sx={{ height: 300 }}>
              <Line 
                data={lineChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Pie Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Open Rate</Typography>
            <Box sx={{ height: 250, display: 'flex', justifyContent: 'center' }}>
              <Pie 
                data={pieChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false
                }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Bar Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Top Email Performance</Typography>
            <Box sx={{ height: 250 }}>
              <Bar 
                data={{
                  labels: ['Project Proposal', 'Meeting Follow-up', 'Product Demo', 'Introduction', 'Newsletter'],
                  datasets: [
                    {
                      label: 'Open Rate (%)',
                      data: [85, 72, 68, 60, 45],
                      backgroundColor: 'rgba(54, 162, 235, 0.8)'
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100
                    }
                  }
                }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;
