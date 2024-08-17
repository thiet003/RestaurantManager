const Joi = require('joi');

const passwordValidation = (data) => {
    const schema = Joi.object({
        newPassword: Joi.string().min(6).max(30).regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{6,30}$/)
            .required()
            .messages({
                "string.pattern.base": `"newPassword" must be between 6-30 characters long, include at least one uppercase letter, one lowercase letter, and one digit.`
        }),
    });
    return schema.validate(data);
}
module.exports = passwordValidation;