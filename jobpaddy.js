require('dotenv').config(); // Load environment variables from .env
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');

const token = process.env.TOKEN; 
const bot = new TelegramBot(token, { polling: true });

// Function to fetch job listings from the website
async function fetchJobListings(category) {
    try {
        // URL with search parameters based on the user's category input
        const url = `${process.env.API_URL}${encodeURIComponent(category)}`;

        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const jobListings = [];

        // Extract job listings from the HTML response
        $('.job').each((index, element) => {
            const title = $(element).find('.title a').text().trim();
            const company_name = $(element).find('.company').text().trim();
            const location = $(element).find('.location').text().trim();
            const salary = $(element).find('.salary').text().trim();
            const description = $(element).find('.desc').text().trim();
            const link = $(element).find('header h2 a').attr('href');
            const web = `${process.env.WEB}`;

            jobListings.push({ title, company_name, location, salary, description, link });
        });
        return jobListings;
    } catch (error) {
        console.error('Error fetching job listings:', error);
        return [];
    }
}

// Handle /jobpaddy command
bot.onText(/\/jobpaddy/, async (msg) => {
    const chatId = msg.chat.id;

    // Prompt user to select the kind of job they are looking for
    bot.sendMessage(chatId, "Welcome to JobPaddy! What kind of job are you looking for? Please enter a category (e.g., Software, Design, Marketing).");

    // Handle user inputs
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const category = msg.text.toLowerCase();

        // Fetch job listings from the function
        const jobListings = await fetchJobListings(category);

        if (jobListings.length > 0) {
            let jobListingText = '';

            jobListings.forEach((job, index) => {
                const jobText = `${index + 1}. [${job.title}]Job Link: (${process.env.WEB}${job.link}) ${job.company_name} (${job.location})\n${job.description} salary of ${job.salary}\n\n`;
                if (jobListingText.length + jobText.length <= 4096) { // Check if adding the job listing exceeds the message length limit
                    jobListingText += jobText;
                } else {
                    // Send the accumulated job listings so far
                    bot.sendMessage(chatId, jobListingText, { parse_mode: 'Markdown' });
                    jobListingText = jobText; // Start a new message with the current job listing
                }
            });

            // Send the remaining job listings
            if (jobListingText) {
                bot.sendMessage(chatId, jobListingText, { parse_mode: 'Markdown' });
            }
        } else {
            bot.sendMessage(chatId, `Oops! There are no available jobs for the ${category} category.`);
        }
    });
});
