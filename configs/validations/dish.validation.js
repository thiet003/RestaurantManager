const Joi = require('joi');

const dishSchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.number().required().min(0),
    category: Joi.string().required(),
});

module.exports = {dishSchema};