import axios from 'axios';

export const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: 'Failed to validate user',
            status: 'failed'
        });
    }

    try {
        // Attempt to validate as an ID token
        let response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        let userInfo = response.data;


        // Ensure required fields are present
        if (!userInfo.email) {
            return res.status(401).json({
                message: 'Failed to validate user',
                status: 'failed'
            });
        }

        req.user = {
            id: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name || 'Unknown User',
        };

        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        return res.status(401).json({
            message: 'Failed to validate user',
            status: 'failed',
            details: error.response?.data || error.message
        });
    }
};
