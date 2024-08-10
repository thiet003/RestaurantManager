const pool = require('../databases/connect_to_postgre');
const cloudinary = require('../configs/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const createError = require('http-errors');
const {dishSchema} = require('../configs/validations/dish.validation');
// Cấu hình Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads',
        format: async (req, file) => 'jpg', // Định dạng tệp (nếu cần thiết)
        public_id: (req, file) => Date.now() + '-' + file.originalname // Đặt tên tệp trên Cloudinary
    }
});

// Cấu hình multer để sử dụng Cloudinary Storage
const upload = multer({ storage: storage });

// Controller lấy tất cả món ăn
const getAllDishes = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1; // Default to page 1
        let limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
        let keyword = req.query.keyword || '';
        let offset = (page - 1) * limit;
        let category = req.query.category || '';
        if(category === 'Tất cả'){
            category = '';
        }
        // Query to get the total number of matching dishes
        const countQuery = {
            text: `SELECT COUNT(*) FROM dishes WHERE name LIKE $1` + (category ? ` AND category = '${category}'` : ''),
            values: [`%${keyword}%`]
        };

        const countResult = await pool.query(countQuery);
        const totalDishes = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalDishes / limit);

        // Query to get the dishes for the current page
        const query = {
            text: `SELECT * FROM dishes WHERE name LIKE $1` + (category ? ` AND category = '${category}'` : '') + ` ORDER BY dish_id LIMIT $2 OFFSET $3`,
            values: [`%${keyword}%`, limit, offset]
        };

        const result = await pool.query(query);
        res.send({
            dishes: result.rows,
            totalPages: totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error("Error fetching dishes:", error);
        res.status(500).send("Not able to fetch dishes");
    }
};
// Lấy món ăn theo ID
const getDishById = (req, res) => {
    const id = parseInt(req.params.id);
    if(!id || id < 0 || isNaN(id)){
        return res.status(400).json({"status": 400,"message": "Invalid dish id!"});
    }
    const query = {
        text: `SELECT * FROM dishes WHERE dish_id = $1`,
        values: [id]
    }
    const queryImages = {
        text: `SELECT image_url FROM dish_images WHERE dish_id = $1`,
        values: [id]
    }
    pool.query(query, (error
        , result) => {
        if (error) {
            return res.status(400).json({ message: "Can't get dish by id" });
        }
        if(result.rows.length === 0){
            return res.status(404).json({message: 'Dish not found'});
        }
        pool.query(queryImages, (error, resultImages) => {
            if (error) {
                return res.status(400).json({ message: "Can't get dish images by id" });
            }
            result.rows[0].images = resultImages.rows;
            res.send(result.rows[0]);
        });
    });
}

// Controller tạo món ăn, xử lý việc tải lên hình ảnh lên Cloudinary
const createDish = async (req, res) => {
    try {
        const { name, description, price, category } = req.body;
        // Validate dữ liệu
        const data = { name, description, price, category };
        const { error } = dishSchema.validate(data);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        // Kiểm tra nếu req.files có dữ liệu
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded'});
        }
        // Danh sách url ảnh
        let listThumbnail = [];
        // Danh sách các hình ảnh đã tải lên Cloudinary
        const images = req.files.map(file => file.path);
        // Ảnh đại diện của món ăn
        let imageUrl;
        // Duyệt qua từng hình ảnh và tải lên Cloudinary
        for (const [index, image] of images.entries()) {
            try {
                const uploadedResponse = await cloudinary.uploader.upload(image, {
                    upload_preset: 'dishes'
                });
                if (index === 0) { // Chỉ lấy URL của hình ảnh đầu tiên
                    imageUrl = uploadedResponse.secure_url;
                }
                listThumbnail.push(uploadedResponse.secure_url);
            } catch (uploadError) {
                console.error('Error uploading to Cloudinary:', uploadError);
                return res.status(500).json({ message: 'Error uploading image to Cloudinary' });
            }
        }
        // Kiểm tra nếu imageUrl đã được gán
        if (!imageUrl) {
            return res.status(400).json({ message: 'No image URL obtained from Cloudinary' });
        }
        // Insert dữ liệu vào bảng dishes và lấy dish_id
        const query = {
            text: `INSERT INTO dishes(name, description, price, thumbnail, category) VALUES($1, $2, $3, $4, $5) RETURNING dish_id`,
            values: [name, description, price, imageUrl, category]
        };
        pool.query(query, (error, result) => {
            if (error) {
                console.error('Database error:', error);
                return res.status(400).json({ message: 'Create dish failed' });
            }
            // Lấy dish_id từ kết quả truy vấn
            const dishId = result.rows[0].dish_id;

            // Chèn hình ảnh vào bảng Dish_Images
            const imageInsertPromises = listThumbnail.map(imageUrl => {
                const imageQuery = {
                    text: `INSERT INTO dish_images(dish_id, image_url) VALUES($1, $2)`,
                    values: [dishId, imageUrl]
                };
                return pool.query(imageQuery);
            });
            Promise.all(imageInsertPromises)
                .then(() => {
                    res.status(201).json({ message: 'Create dish successfully', dishId });
                })
                .catch(err => {
                    console.error('Error inserting images:', err);
                    res.status(500).json({ message: 'Error inserting images' });
                });
        });
    } catch (error) {
        console.error('Error in createDish:', error);
        res.status(500).json({ message: 'Cannot create dish' });
    }
};

// Sửa món ăn
const updateDish = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        // Kiểm tra id có hợp lệ không
        if(!id || id < 0 || isNaN(id)){
            return res.status(400).json({"status": 400,"message": "Invalid dish id!"});
        }
        // Lấy thông tin từ body
        const { name, description, price, category, thumbnail } = req.body;
        // Validate dữ liệu
        const data = { name, description, price, category };
        const { error } = dishSchema.validate(data);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        // Lấy danh sách hình ảnh từ req.files
        const images = req.files.map(file => file.path) || [];
        // Nếu không sửa ảnh 
        if(!thumbnail && images.length === 0){
            let query = {
                text: `UPDATE dishes SET name = $1, description = $2, price = $3, category = $4 WHERE dish_id = $5`,
                values: [name, description, price, category, id]
            };
            pool.query(query, (error, result) => {
                if (error) {
                    return res.status(400).json({ message: error.detail });
                }
                return res.status(200).json({ message: 'Update dish successfully' });
            });
        }
        else if(thumbnail) // Nếu sửa ảnh đại diện
        {
            let query = {
                text: `UPDATE dishes SET name = $1, description = $2, price = $3, category = $4, thumbnail = $5 WHERE dish_id = $6`,
                values: [name, description, price, category, thumbnail, id]
            };
            pool.query(query, (error, result) => {
                if (error) {
                    return res.status(400).json({ message: error.detail });
                }
                return res.status(200).json({ message: 'Update dish successfully with change thumbnail!' });
            });
        }
        else { // Nếu thay toàn bộ hình ảnh
            // Xoá hình ảnh cũ
            let deleteQuery = {
                text: `DELETE FROM dish_images WHERE dish_id = $1`,
                values: [id]
            };
            pool.query(deleteQuery, (error, result) => {
                if (error) {
                    return res.status(400).json({ message: 'Delete images failed' });
                }
            });
            // Tải lên hình ảnh mới
            let listThumbnail = [];
            let imageUrl;
            for (const [index, image] of images.entries()) {
                try {
                    const uploadedResponse = await cloudinary.uploader.upload(image, {
                        upload_preset: 'dishes'
                    });
                    imageUrl = uploadedResponse.secure_url;
                    listThumbnail.push(uploadedResponse.secure_url);
                } catch (uploadError) {
                    console.error('Error uploading to Cloudinary:', uploadError);
                    return res.status(500).json({ message: 'Error uploading image to Cloudinary' });
                }
            }

            if (!imageUrl) {
                return res.status(400).json({ message: 'No image URL obtained from Cloudinary' });
            }
            // Cập nhật thông tin món ăn
            let query = {
                text: `UPDATE dishes SET name = $1, description = $2, price = $3, category = $4, thumbnail = $5 WHERE dish_id = $6`,
                values: [name, description, price, category, imageUrl, id]
            };
            pool.query(query, (error, result) => {
                if (error) {
                    return res.status(400).json({ message: error.detail });
                }
                // Thêm hình ảnh vào bảng Dish_Images
                const dishId = id;
                const imageInsertPromises = listThumbnail.map(imageUrl => {
                    const imageQuery = {
                        text: `INSERT INTO dish_images(dish_id, image_url) VALUES($1, $2)`,
                        values: [dishId, imageUrl]
                    };
                    return pool.query(imageQuery);
                });
                Promise.all(imageInsertPromises)
                    .then(() => {
                        res.status(200).json({ message: 'Update dish successfully' });
                    })
                    .catch(err => {
                        console.error('Error inserting images:', err);
                        res.status(500).json({ message: 'Error inserting images' });
                    });
            });
        }
    } catch (error) {
        console.error('Error in updateDish:', error);
        return res.status(500).json({ message: 'Cannot update dish because an error occurred' });
    }
}

// Xóa món ăn
const deleteDish = (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if(!id || id < 0 || isNaN(id)){
            return res.status(400).json({"status": 400,"message": "Invalid dish id!"});
        }
        const queryImages = {
            text: `DELETE FROM dish_images WHERE dish_id = $1`,
            values: [id]
        };
        const query = {
            text: `DELETE FROM dishes WHERE dish_id = $1`,
            values: [id]
        };
        pool.query(queryImages, (error, result) => {
            if (error) {
                return res.status(400).json({ message: 'Delete dish failed' });
            }
            pool.query(query, (error, result) => {
                if (error) {
                    return res.status(400).json({ message: `Delete dish failed: ${error.detail}` });
                }
                return res.status(200).json({ message: 'Delete dish successfully'});
            });
        });
    } catch (error) {
        return res.status(500).json({ message: 'Cannot delete dish because an error occurred' });
    }
};

// Export các hàm xử lý
module.exports = {
    upload,
    getAllDishes,
    getDishById,
    createDish,
    updateDish,
    deleteDish
}