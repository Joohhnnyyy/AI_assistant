# AI Assistant Code Editor

A full-stack AI-powered code editor with Gemini 2.0 Flash integration, providing an intelligent coding experience with features like code completion, AI chat, and more.

## 📋 Overview

AI Assistant is a powerful, open-source code editor enhanced with AI capabilities. Built with modern web technologies, it offers a seamless development experience with the power of Google's Gemini AI. Whether you're writing code, debugging, or learning new programming concepts, AI Assistant is designed to be your intelligent coding companion.

### Key Benefits
- **AI-Powered Development**: Get intelligent code suggestions and completions powered by Gemini 2.0 Flash
- **Modern Web-Based**: Access your development environment from anywhere with a web browser
- **Extensible Architecture**: Built to support multiple AI providers and extensions
- **Developer First**: Designed by developers, for developers

### Use Cases
- **Learning to Code**: Get explanations and examples for programming concepts
- **Productivity**: Speed up development with AI-assisted coding
- **Code Review**: Get AI-powered suggestions for improving your code
- **Teaching**: Use as an educational tool for programming courses

### Project Status
🚀 **Active Development** - New features and improvements are being added regularly

💡 **Open for Contributions** - We welcome contributions of all kinds!

## 🚀 Features

### Core Editor Features
- **Monaco Editor Integration**: Professional-grade code editor (same as VS Code)
- **Multi-language Support**: Syntax highlighting for JavaScript, TypeScript, Python, Java, C++, Rust, Go, and more
- **File Management**: Tree-based file explorer with tabbed interface
- **Code Execution**: Built-in run panel for executing code
- **Hotkey Support**: Keyboard shortcuts for common actions

### AI-Powered Features
- **Gemini 2.0 Flash Integration**: Advanced AI code completion and assistance
- **AI Chat Panel**: Interactive AI conversations about code and programming
- **Code Generation**: AI-powered code generation based on natural language prompts
- **Image Analysis**: Upload images for AI analysis and code generation
- **Context-Aware Suggestions**: AI understands your project structure and file contents
- **Multi-modal AI**: Support for both text and image inputs

### Development Tools
- **File System Operations**: Create, read, write, and manage files
- **Git Integration**: Version control operations directly in the editor
- **Template System**: Pre-built code templates for common patterns
- **Notification System**: User feedback for all operations
- **Real-time Updates**: Live collaboration and file synchronization

### Advanced Capabilities
- **Multi-file Context**: AI can analyze and understand multiple files simultaneously
- **Code Refactoring**: AI-assisted code improvement suggestions
- **Documentation Generation**: Auto-generate code documentation
- **Error Analysis**: AI-powered debugging assistance
- **Learning Mode**: Educational explanations for programming concepts

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Monaco Editor, TailwindCSS
- **Backend**: Node.js, Express
- **AI**: Google Gemini 2.0 Flash API
- **Version Control**: Git
- **Database**: MongoDB (with in-memory server for development)
- **File Handling**: Multer for file uploads, fs for file operations

## 📁 Project Structure

```
.
├── client/                 # Frontend React application
│   ├── public/            # Static files
│   ├── src/               # React components and logic
│   │   ├── components/    # UI components
│   │   ├── api/          # API integration
│   │   └── hooks/        # Custom React hooks
│   └── package.json       # Frontend dependencies
│
├── server/                # Backend Node.js server
│   ├── routes/            # API routes
│   ├── models/            # Database models
│   ├── index.js           # Server entry point
│   └── package.json       # Backend dependencies
│
├── shared/                # Shared utilities and types
├── uploads/               # File upload directory
└── test/                  # Test files and scripts
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 16 or higher
- **npm or yarn**: Package manager
- **Google Gemini API Key**: Required for AI features
- **Git**: For version control operations

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Joohhnnyyy/AI_assistant.git
   cd AI_assistant
   ```

2. **Install server dependencies**:
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**:
   ```bash
   cd ../client
   npm install
   ```

4. **Set up environment variables**:
   
   **Server Environment** (create `.env` file in `server/` directory):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/ai_assistant
   ```
   
   **Client Environment** (create `.env` file in `client/` directory):
   ```env
   VITE_API_URL=http://localhost:3001
   ```

### Starting the Servers

#### Option 1: Development Mode (Recommended for development)

1. **Start the Backend Server** (Terminal 1):
   ```bash
   cd server
   npm run dev
   ```
   - This starts the server with nodemon for auto-restart on changes
   - Server will run on `http://localhost:3001`
   - Expected output: "Server running on port 3001"

2. **Start the Frontend Development Server** (Terminal 2):
   ```bash
   cd client
   npm run dev
   ```
   - This starts Vite dev server with hot reload
   - Frontend will run on `http://localhost:5173`
   - Expected output: "Local: http://localhost:5173/"

#### Option 2: Production Mode

1. **Start the Backend Server**:
   ```bash
   cd server
   npm start
   ```

2. **Build and Serve Frontend**:
   ```bash
   cd client
   npm run build
   npm run preview
   ```

### Accessing the Application

- **Frontend**: Open `http://localhost:5173` in your browser
- **Backend API**: Available at `http://localhost:3001`
- **API Endpoints**: 
  - AI: `http://localhost:3001/api/ai/*`
  - Auth: `http://localhost:3001/api/auth/*`
  - Files: `http://localhost:3001/api/fs/*`
  - Git: `http://localhost:3001/api/git/*`
  - Run: `http://localhost:3001/api/run/*`

### Troubleshooting

#### Common Issues:

1. **Port Already in Use**:
   - Change the port in server `.env` file
   - Update client `.env` to match the new port

2. **Gemini API Key Issues**:
   - Verify your API key is correct
   - Check the `/api/ai/debug` endpoint for key validation

3. **Dependencies Issues**:
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again

4. **File Permission Issues**:
   - Ensure the `uploads/` directory is writable
   - Check file permissions in your project directory

## 🔧 Configuration

### Environment Variables

#### Server (`.env` in `server/`)
- `GEMINI_API_KEY`: Your Google Gemini API key (required)
- `PORT`: Server port (default: 3001)
- `MONGODB_URI`: MongoDB connection string (optional, uses in-memory by default)

#### Client (`.env` in `client/`)
- `VITE_API_URL`: URL of the backend API (default: `http://localhost:3001`)

### Available Scripts

#### Server Scripts (`server/package.json`)
- `npm run dev`: Start development server with nodemon
- `npm start`: Start production server

#### Client Scripts (`client/package.json`)
- `npm run dev`: Start development server with Vite
- `npm run build`: Build for production
- `npm run preview`: Preview production build

## 📊 Project Updates & Milestones

### Latest Updates (Current Version)
- ✅ **Enhanced AI Chat Panel**: Improved conversation flow and context management
- ✅ **Notification System**: User feedback for all operations
- ✅ **Advanced File Management**: Better file tree and tab management
- ✅ **Image Upload Support**: AI can now analyze and work with images
- ✅ **Improved API Routes**: Enhanced authentication, file operations, and AI endpoints
- ✅ **Better Error Handling**: Comprehensive error handling and user feedback
- ✅ **Hotkey System**: Keyboard shortcuts for improved productivity

### Recent Features Added
- **Multi-modal AI**: Support for text and image inputs
- **File Context Analysis**: AI understands project structure
- **Enhanced Run Panel**: Better code execution interface
- **Improved Tabs System**: Better tab management and file switching
- **Advanced AI Prompts**: Context-aware AI suggestions

### Planned Features
- 🔄 **Real-time Collaboration**: Multi-user editing support
- 🔄 **Plugin System**: Extensible architecture for custom features
- 🔄 **Advanced Git Integration**: Visual diff and merge tools
- 🔄 **Code Review Tools**: AI-powered code review assistance
- 🔄 **Performance Monitoring**: Built-in performance analysis tools

## 🤝 Contributing

We welcome contributions from the community. Please follow these guidelines when contributing to the project.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and structure
- Add tests for new features
- Update documentation for any API changes
- Ensure all features work in both development and production modes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Gemini](https://ai.google.dev/) - For the powerful AI models
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - For the code editor component
- [Vite](https://vitejs.dev/) - For the fast development server
- [React](https://reactjs.org/) - For building the user interface
- [Express](https://expressjs.com/) - For the backend framework
- [TailwindCSS](https://tailwindcss.com/) - For the styling framework
