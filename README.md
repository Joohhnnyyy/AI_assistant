# Gemini AI Code Editor

A full-stack AI-powered code editor with Gemini 2.0 Flash integration, providing an intelligent coding experience with features like code completion, AI chat, and more.

## 🚀 Features

- **AI-Powered Code Assistance**
  - Smart code completions powered by Gemini 2.0 Flash
  - Inline code suggestions and improvements
  - AI chat for code-related questions and explanations

- **Modern Web-Based Editor**
  - Built with Monaco Editor (same as VS Code)
  - Multiple file support with tabbed interface
  - Syntax highlighting for multiple programming languages

- **Developer Experience**
  - Real-time collaboration features
  - Git integration for version control
  - Extensible architecture for adding more AI providers

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Monaco Editor, TailwindCSS
- **Backend**: Node.js, Express
- **AI**: Google Gemini 2.0 Flash API
- **Version Control**: Git

## 📁 Project Structure

```
.
├── client/                 # Frontend React application
│   ├── public/            # Static files
│   ├── src/               # React components and logic
│   └── package.json       # Frontend dependencies
│
├── server/                # Backend Node.js server
│   ├── routes/            # API routes
│   ├── index.js           # Server entry point
│   └── package.json       # Backend dependencies
│
└── shared/                # Shared utilities and types
```

## 🚀 Getting Started

### Prerequisites

- Node.js v16+
- npm or yarn
- Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Joohhnnyyy/gemini_assistant.git
   cd gemini_assistant
   ```

2. Install dependencies for both client and server:
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the `server` directory:
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     PORT=3001
     ```
   - Create a `.env` file in the `client` directory:
     ```
     VITE_API_URL=http://localhost:3001
     ```

### Running the Application

1. Start the backend server:
   ```bash
   cd server
   npm start
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   cd client
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## 🔧 Configuration

### Environment Variables

#### Server (`.env` in `server/`)
- `GEMINI_API_KEY`: Your Google Gemini API key
- `PORT`: Server port (default: 3001)

#### Client (`.env` in `client/`)
- `VITE_API_URL`: URL of the backend API (default: `http://localhost:3001`)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Gemini](https://ai.google.dev/) - For the powerful AI models
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - For the code editor component
- [Vite](https://vitejs.dev/) - For the fast development server
- [React](https://reactjs.org/) - For building the user interface
