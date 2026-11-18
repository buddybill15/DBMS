const express = require('express');
const db = require('./mysql');

const app = express();
const PORT = 3000;

//Set up the mandatory Get route at the root path (/)
app.get('/', async (req, res) => {
    try {
        //Extract and normalize the format parameter, defaulting to 'json' if not provided
        const formatParam = req.query.format ? req.query.format.toLowerCase() : 'json';

        //Initialize the base SQL statement and query tracking structures
        let sql = 'SELECT * FROM books';
        const queryParams = [];
        const conditions = [];

        //Dynamically process URL query parameters to construct targeted filters
        for (const [key, value] of Object.entries(req.query)) {
            //Skip the format parameter since it controls presentation rather than database filtering
            if (key !== 'format') {
                //Safeguard against SQL injcetion and invalid columns by explicitly validating allowed fields 
                const allowedColumns = ['bookid', 'title', 'author', 'category', 'price'];
                if (allowedColumns.includes(key.toLowerCase())) {
                    //Append a parameterized condition and track the query value
                    conditions.push(`${key} = ?`);
                    queryParams.push(value);
                }
            }
        }

        //If filtering criteria are present, append the Where clause dynamically using AND conjunctions
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        //Execute the parameterized query safely against the database to protect agiainst injection attacks
        const [rows] = await db.query(sql, queryParams);

        //Branch presentation Logic based on the requested formate parameter
        if (formatParam === 'text') {
            //Handle edge case where the query returns zero rows
            if (rows.length === 0) {
                return res.send('<h3>No matching records found in the database.</h3>');
            }

            //Build a readable HTML Layout string to display book records inside a structured table
            let textTableHtml = `
                <h2>Book Search Results (Text Format)</h2>
                <table border="1" cellpadding="6" style="border-collapse: collapse; font-family: sans-serif;">
                    <thead>
                        <tr style="background-color: #eaeaea;">
                            <th>ID</th>
                            <th>Title</th>
                            <th>Author</th>
                            <th>Category</th>
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            //Loop over records to populate table rows dynamically
            rows.forEach(book => {
                textTableHtml += `
                    <tr>
                        <td>${book.bookid}</td>
                        <td>${book.title}</td>
                        <td>${book.author}</td>
                        <td>${book.category}</td>
                        <td>$${Number(book.price).toFixed(2)}</td>
                    </tr>
                `;
            });

            textTableHtml += `</tbody></table>`;

            //Set response headers explicitly to inform the browser to render standard HTML content
            res.setHeader('Content-Type', 'text/html');
            return res.send(textTableHtml);
        } else {
            //Default output path: Return database as a clean standard
            return res.json(rows);
        }

    } catch (error) {
        //Handle runtime or database server query failures gracefully to prevent app crashes
        console.error('Database Query Error:', error.message);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            message: error.message 
        });
    }
});

//Bind the express web server framework to listen for network traffic on the designated port
app.listen(PORT, () => {
    console.log(`Server is running successfully on port ${PORT}`);
});
