import './style.css'
import { AuthManager } from './auth/AuthManager'
import { UIManager } from './ui/UIManager'

class App {
  private authManager: AuthManager
  private uiManager: UIManager

  constructor() {
    this.authManager = new AuthManager()
    this.uiManager = new UIManager(this.authManager)
    this.init()
  }

  private async init() {
    await this.authManager.initialize()
    this.uiManager.render()
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Handle form submissions and UI interactions
    this.uiManager.setupEventListeners()
  }
}

// Initialize the app
new App()