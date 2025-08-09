const express = require('express');
const { query } = require('../database');

const router = express.Router();

// Get all settings
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT key, value, type, description
      FROM settings 
      ORDER BY key
    `);
    
    const settings = {};
    result.rows.forEach(row => {
      let value = row.value;
      
      // Parse value based on type
      switch (row.type) {
        case 'boolean':
          value = value === 'true';
          break;
        case 'number':
          value = parseFloat(value);
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            console.error(`Invalid JSON for setting ${row.key}:`, value);
          }
          break;
        // 'string' type needs no conversion
      }
      
      settings[row.key] = {
        value,
        type: row.type,
        description: row.description
      };
    });

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: 'Failed to get settings',
      message: error.message
    });
  }
});

// Update a setting
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({
        error: 'Value is required'
      });
    }

    // Get current setting to validate type
    const currentResult = await query('SELECT type FROM settings WHERE key = $1', [key]);
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Setting not found'
      });
    }

    const settingType = currentResult.rows[0].type;
    let stringValue;

    // Validate and convert value based on type
    switch (settingType) {
      case 'boolean':
        if (typeof value !== 'boolean') {
          return res.status(400).json({
            error: 'Value must be a boolean'
          });
        }
        stringValue = value.toString();
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return res.status(400).json({
            error: 'Value must be a number'
          });
        }
        stringValue = value.toString();
        break;
      case 'json':
        try {
          stringValue = JSON.stringify(value);
        } catch (e) {
          return res.status(400).json({
            error: 'Value must be valid JSON'
          });
        }
        break;
      case 'string':
        if (typeof value !== 'string') {
          return res.status(400).json({
            error: 'Value must be a string'
          });
        }
        stringValue = value;
        break;
      default:
        return res.status(400).json({
          error: 'Unknown setting type'
        });
    }

    // Update the setting
    await query(`
      UPDATE settings 
      SET value = $1, updated_at = NOW()
      WHERE key = $2
    `, [stringValue, key]);

    res.json({
      success: true,
      message: 'Setting updated successfully',
      key,
      value
    });

  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      error: 'Failed to update setting',
      message: error.message
    });
  }
});

// Reset setting to default
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;

    const result = await query(`
      UPDATE settings 
      SET value = default_value, updated_at = NOW()
      WHERE key = $1
      RETURNING value, type
    `, [key]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Setting not found'
      });
    }

    let value = result.rows[0].value;
    const type = result.rows[0].type;

    // Parse value based on type
    switch (type) {
      case 'boolean':
        value = value === 'true';
        break;
      case 'number':
        value = parseFloat(value);
        break;
      case 'json':
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error(`Invalid JSON for setting ${key}:`, value);
        }
        break;
    }

    res.json({
      success: true,
      message: 'Setting reset to default',
      key,
      value
    });

  } catch (error) {
    console.error('Reset setting error:', error);
    res.status(500).json({
      error: 'Failed to reset setting',
      message: error.message
    });
  }
});

module.exports = router;