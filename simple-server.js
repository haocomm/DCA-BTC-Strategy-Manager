const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ success: true, data: { user: { id: '1', email: 'demo@dca.com', name: 'Demo User' } } });
});

app.get('/api/strategies', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'BTC DCA Strategy', pair: 'BTCUSDT', amount: 100, frequency: 'daily', isActive: true },
      { id: '2', name: 'ETH Weekly DCA', pair: 'ETHUSDT', amount: 200, frequency: 'weekly', isActive: false }
    ]
  });
});

app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalStrategies: 2,
      activeStrategies: 1,
      totalInvested: 5000,
      currentValue: 5500,
      totalProfit: 500,
      profitPercentage: 10
    }
  });
});

app.get('/api/exchanges', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'Binance', type: 'binance', isActive: true },
      { id: '2', name: 'Coinbase', type: 'coinbase', isActive: false }
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DCA Strategy Manager API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);
});