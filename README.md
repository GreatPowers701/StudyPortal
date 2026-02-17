# Study Portal - Multi-Test Manager

A modern, feature-rich web application designed to help students manage practice tests, track performance, and organize study tasks. Built with a sleek Glassmorphism UI, it integrates seamless test-taking tools with powerful analytics.

![Study Portal Screenshot](https://via.placeholder.com/800x400?text=Study+Portal+Preview) *Add a screenshot of your dashboard here.*

## ✨ Features

*   **Interactive Test Taking:**
    *   **JSON-based Quizzes:** Upload test answer keys in JSON format to generate practice sessions instantly.
    *   **Timed Sessions:** Built-in timer with customizable goals (e.g., "Complete 20 questions in 30 mins").
    *   **Real-time Feedback:** Immediate validation of answers with detailed explanations (if provided in JSON).
*   **Performance Analytics:**
    *   **Visual Reports:** View detailed performance summaries after each test.
    *   **Progress Tracking:** Monitor your scores and improvement over time.
    *   **Question Filtering:** Easily review *Wrong*, *Unattempted*, or *Marked* questions.
*   **Task Management:**
    *   **Integrated To-Do List:** Manage study tasks directly within the portal.
    *   **Google Tasks Sync:** Seamlessly sync your to-dos with your Google Tasks account.
    *   **Due Dates:** Set deadlines for your study goals.
*   **Modern UI/UX:**
    *   **Glassmorphism Design:** A beautiful, translucent interface with dynamic backgrounds.
    *   **Dark/Light Mode:** Fully responsive theme switching for comfortable studying at any time.
    *   **Responsive:** optimized for desktop and mobile devices.
*   **Cloud Sync:**
    *   **Firebase Integration:** detailed test history and user data are securely stored in the cloud.
    *   **Google Sign-In:** Easy and secure authentication.

## 🚀 Getting Started

### Prerequisites

*   A modern web browser (Chrome, Firefox, Edge, Safari).
*   A local web server (required for Google Auth and Firebase to function correctly due to CORS policies).

### Installation & Running

1.  **Clone or Download** the repository to your local machine.
2.  **Start a Local Server:**
    Since the application uses Firebase Authentication and Google APIs, it cannot be run directly via `file://`. You need to serve it over `http://` or `https://`.

    If you have Python installed, you can run:
    ```bash
    # Run this command in the project directory
    python3 -m http.server 8000
    ```
    
    Or using Node.js `http-server`:
    ```bash
    npx http-server .
    ```

3.  **Open the App:**
    Navigate to `http://localhost:8000/checker%20gemini.html` (or the specific file name you are using) in your browser.

## 🛠️ Configuration

This project relies on **Firebase** and **Google Cloud Console** for backend services.

### Firebase Setup
The current version includes a default configuration. To use your own backend:
1.  Create a project in the [Firebase Console](https://console.firebase.google.com/).
2.  Enable **Authentication** (Google Sign-In) and **Firestore Database**.
3.  Update the `firebaseConfig` object in the HTML file with your project's credentials.

### Google Tasks API
To enable Google Tasks integration:
1.  Enable the **Google Tasks API** in your Google Cloud Console.
2.  Create an OAuth unique Client ID.
3.  Update the `TASKS_CLIENT_ID` and `TASKS_API_KEY` variables in the code.

## 📂 Project Structure

*   `checker gemini.html`: The main application file containing HTML, CSS (Tailwind), and JavaScript logic.
*   `assets/`: (Create this folder if you have static assets like images or custom icons).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to fork the repository and submit a pull request.

## 📄 License

This project is open-source and available for personal and educational use.

---

**Happy Studying! 📚**
