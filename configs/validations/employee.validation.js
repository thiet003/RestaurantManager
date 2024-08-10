const Joi = require('joi');

const employeeValidation = (data) => {
    const schema = Joi.object({
        username: Joi.string().min(4).required(),
        password: Joi.string().min(6).max(30).regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{6,30}$/)
            .required()
            .messages({
                "string.pattern.base": `"password" must be between 6-30 characters long, include at least one uppercase letter, one lowercase letter, and one digit.`
        }),
        name: Joi.string().required(),
        phone: Joi.string().min(10).regex(/^[0-9]+$/).required()
            .messages({
                "string.pattern.base": `"phone" must contain only digits and be at least 10 characters long.`
            }),
        role: Joi.string().required(),  
        position: Joi.string().required(),
        hire_date: Joi.date().iso().required().messages({
            "date.format": `"hire_date" must be in the format YYYY-MM-DD.`
        })
    });
    return schema.validate(data);
}

module.exports = employeeValidation;