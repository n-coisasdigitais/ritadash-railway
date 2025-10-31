// server.js - Middleware Node.js para Google Ads API
import express from 'express';
import { GoogleAdsApi } from 'google-ads-api';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ALLOWED_API_KEY = process.env.API_KEY; // Chave para autenticar chamadas

// Middleware de autenticação
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== ALLOWED_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Endpoint para buscar keywords
app.post('/api/keywords', authenticate, async (req, res) => {
  try {
    const { 
      customerId, 
      accessToken, 
      refreshToken, 
      developerToken,
      clientId,
      clientSecret,
      dateRange = 'LAST_7_DAYS'
    } = req.body;

    // Validação
    if (!customerId || !refreshToken || !developerToken || !clientId || !clientSecret) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['customerId', 'refreshToken', 'developerToken', 'clientId', 'clientSecret']
      });
    }

    // Inicializar cliente Google Ads
    const client = new GoogleAdsApi({
      client_id: clientId,
      client_secret: clientSecret,
      developer_token: developerToken
    });

    // Criar customer com refresh token
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: refreshToken
    });

    // Query GAQL para keywords
    const query = `
      SELECT 
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group_criterion.effective_cpc_bid_micros,
        ad_group_criterion.quality_info.quality_score,
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM keyword_view
      WHERE segments.date DURING ${dateRange}
        AND ad_group_criterion.type = KEYWORD
        AND campaign.status = ENABLED
        AND ad_group.status = ENABLED
    `;

    // Executar query
    const results = await customer.query(query);

    // Processar resultados
    const keywords = results.map(row => ({
      criterionId: row.ad_group_criterion.criterion_id,
      keywordText: row.ad_group_criterion.keyword.text,
      matchType: row.ad_group_criterion.keyword.match_type,
      status: row.ad_group_criterion.status,
      maxCpcMicros: row.ad_group_criterion.effective_cpc_bid_micros,
      qualityScore: row.ad_group_criterion.quality_info?.quality_score || null,
      campaignId: row.campaign.id,
      campaignName: row.campaign.name,
      adGroupId: row.ad_group.id,
      adGroupName: row.ad_group.name,
      date: row.segments.date,
      metrics: {
        impressions: parseInt(row.metrics.impressions) || 0,
        clicks: parseInt(row.metrics.clicks) || 0,
        costMicros: parseInt(row.metrics.cost_micros) || 0,
        conversions: parseFloat(row.metrics.conversions) || 0,
        conversionsValue: parseFloat(row.metrics.conversions_value) || 0
      }
    }));

    res.json({
      success: true,
      customerId,
      count: keywords.length,
      keywords
    });

  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.errors || []
    });
  }
});

// Endpoint para buscar dados demográficos
app.post('/api/demographics', authenticate, async (req, res) => {
  try {
    const { 
      customerId, 
      refreshToken, 
      developerToken,
      clientId,
      clientSecret,
      dateRange = 'LAST_30_DAYS'
    } = req.body;

    if (!customerId || !refreshToken || !developerToken || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = new GoogleAdsApi({
      client_id: clientId,
      client_secret: clientSecret,
      developer_token: developerToken
    });

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: refreshToken
    });

    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group_criterion.age_range.type,
        ad_group_criterion.gender.type,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM age_range_view
      WHERE segments.date DURING ${dateRange}
        AND campaign.status = ENABLED
    `;

    const results = await customer.query(query);

    const demographics = results.map(row => ({
      campaignId: row.campaign.id,
      campaignName: row.campaign.name,
      adGroupId: row.ad_group.id,
      adGroupName: row.ad_group.name,
      ageRange: row.ad_group_criterion?.age_range?.type || 'UNKNOWN',
      gender: row.ad_group_criterion?.gender?.type || 'UNKNOWN',
      date: row.segments.date,
      metrics: {
        impressions: parseInt(row.metrics.impressions) || 0,
        clicks: parseInt(row.metrics.clicks) || 0,
        costMicros: parseInt(row.metrics.cost_micros) || 0,
        conversions: parseFloat(row.metrics.conversions) || 0
      }
    }));

    res.json({
      success: true,
      customerId,
      count: demographics.length,
      demographics
    });

  } catch (error) {
    console.error('Error fetching demographics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.errors || []
    });
  }
});

// Endpoint para buscar dados geográficos
app.post('/api/geographic', authenticate, async (req, res) => {
  try {
    const { 
      customerId, 
      refreshToken, 
      developerToken,
      clientId,
      clientSecret,
      dateRange = 'LAST_30_DAYS'
    } = req.body;

    if (!customerId || !refreshToken || !developerToken || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = new GoogleAdsApi({
      client_id: clientId,
      client_secret: clientSecret,
      developer_token: developerToken
    });

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: refreshToken
    });

    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        geographic_view.country_criterion_id,
        geographic_view.location_type,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM geographic_view
      WHERE segments.date DURING ${dateRange}
        AND campaign.status = ENABLED
    `;

    const results = await customer.query(query);

    const geographic = results.map(row => ({
      campaignId: row.campaign.id,
      campaignName: row.campaign.name,
      countryCriterionId: row.geographic_view?.country_criterion_id,
      locationType: row.geographic_view?.location_type,
      date: row.segments.date,
      metrics: {
        impressions: parseInt(row.metrics.impressions) || 0,
        clicks: parseInt(row.metrics.clicks) || 0,
        costMicros: parseInt(row.metrics.cost_micros) || 0,
        conversions: parseFloat(row.metrics.conversions) || 0
      }
    }));

    res.json({
      success: true,
      customerId,
      count: geographic.length,
      geographic
    });

  } catch (error) {
    console.error('Error fetching geographic data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.errors || []
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Google Ads Middleware running on port ${PORT}`);
});
