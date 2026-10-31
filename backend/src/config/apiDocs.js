const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const swaggerUi = require('swagger-ui-express');

// Keep the UI and downloadable specification on the same source of truth.
const specification = YAML.parse(fs.readFileSync(path.join(__dirname, '../../../docs/openapi.yaml'), 'utf8'));
// Try it out targets the backend serving the docs, including custom ports/hosts.
specification.servers = [{ url: '/api', description: 'Backend đang phục vụ tài liệu này' }];

module.exports = (app) => {
  app.get('/api-docs/openapi.json', (req, res) => res.json(specification));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specification, {
    customSiteTitle: 'API Đặt và Giao đồ ăn',
    swaggerOptions: {
      validatorUrl: null,
      persistAuthorization: false,
      docExpansion: 'none',
      filter: true,
      displayRequestDuration: true,
    },
  }));
  app.get('/api', (req, res) => res.redirect('/api-docs/'));
};
