const pool = require('../databases/connect_to_postgre');
const bcrypt = require('bcrypt');
const employeeValidation = require('../configs/validations/employee.validation');
const { signAccessToken } = require('../services/auth/AccessToken');

const listEmployees = async (req, res) => {
    try {
        let page = req.query.page || 1;
        let limit = req.query.limit || 10;
        let offset = (page - 1) * limit;
        let keyword = req.query.keyword || '';
        const countQuery = {
            text: 'SELECT COUNT(*) FROM employees WHERE name ILIKE $1 AND deleted = $2',
            values: ['%' + keyword + '%', false]
        };
        const countResult = await pool.query(countQuery);
        const totalPage = Math.ceil(countResult.rows[0].count / limit);

        const mainQuery = {
            text: 'SELECT employee_id, name, username, phone, role, position, hire_date, avatar FROM employees WHERE name ILIKE $1 AND deleted = $2 LIMIT $3 OFFSET $4',
            values: ['%' + keyword + '%', false, limit, offset]
        }
        const result = await pool.query(mainQuery);
        return res.status(200).json({ employees: result.rows, totalPage });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
}

const createEmployee = async (req, res) => {
    const { username, password, name, phone, role, position, hire_date } = req.body;

    // Validate data
    const data = { username, password, name, phone, role, position, hire_date};
    const { error } = employeeValidation(data);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    try {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Check if username already exists
        const checkUsername = {
            text: 'SELECT * FROM employees WHERE username = $1',
            values: [username]
        };
        
        const usernameResult = await pool.query(checkUsername);

        if (usernameResult.rows.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const avatar = 'https://cellphones.com.vn/sforum/wp-content/uploads/2023/10/avatar-trang-4.jpg';

        // Add to database
        const query = {
            text: 'INSERT INTO employees(username, password_hash, name, phone, role, position, hire_date, avatar) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
            values: [username, hashedPassword, name, phone, role, position, hire_date, avatar]
        };
        
        await pool.query(query);

        return res.status(201).json({ message: 'Employee created successfully' });
    } catch (err) {
        return res.status(400).json({ message: 'Error in database operation' });
    }
};


const loginEmployee = async (req, res) => {
    const {username, password} = req.body;
    // Find employee
    const query = {
        text: 'SELECT * FROM employees WHERE username = $1',
        values: [username]
    };
    const result = await pool.query(query);
    if (result.rows.length === 0) {
        return res.status(400).json({ message: 'Username or password is incorrect' });
    }
    // Check password
    const employee = result.rows[0];
    const validPassword = await bcrypt.compare(password, employee.password_hash);
    if (!validPassword) {
        return res.status(400).json({ message: 'Username or password is incorrect' });
    }
    // Return token
    const payload = {
        id: employee.id,
        username: employee.username,
        role: employee.role
    };
    const accessToken = await signAccessToken(payload);
    return res.status(200).json({
        status: 200,
        message: 'Login successfully',
        name: employee.name,
        role: employee.role,
        accessToken: accessToken
    });
};

const deleteEmployee = async (req, res) => {
    try{
        const id = req.params.id;
        const query = {
            text: 'UPDATE employees SET deleted = $1 WHERE employee_id = $2',
            values: [true, id]
        };
        await pool.query(query);
        return res.status(200).json({ message: 'Employee deleted successfully' });
    }catch(err){
        console.log(err.message);
        return res.status(400).json({ message: err.message });
    }
};
const updateEmployee = async (req, res) => {
    try{
        const id = req.params.id;
        const {role, position} = req.body;
        const query = {
            text: 'UPDATE employees SET role = $1, position = $2 WHERE employee_id = $3',
            values: [role, position, id]
        };
        await pool.query(query);
        return res.status(200).json({ message: 'Employee updated successfully' });
    }
    catch(err){
        console.log(err.message);
        return res.status(400).json({ message: err.message });
    }
};

const getEmployeeById = async (req, res) => {
    try{
        const id = req.params.id;
        const query = {
            text: 'SELECT * FROM employees WHERE employee_id = $1',
            values: [id]
        };
        const result = await pool.query(query);
        return res.status(200).json(result.rows[0]);
    }catch(err){
        console.log(err.message);
        return res.status(400).json({ message: err.message });
    }
}

module.exports = {
    listEmployees,
    createEmployee,
    loginEmployee,
    deleteEmployee,
    updateEmployee,
    getEmployeeById
};