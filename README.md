# DAO AI Builder

> Build powerful AI agents visually — no coding required

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](package.json)
[![DAO AI](https://img.shields.io/badge/DAO%20AI-0.1.2-green.svg)](https://github.com/databricks/dao-ai)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![DAO AI Builder Screenshot](docs/images/dao-ai-builder-screenshot.png)

**DAO AI Builder** helps you create AI agents for your business using a visual, point-and-click interface. No need to write code or understand complex configuration files — just fill out forms, connect to your data, and export your agent configuration ready for deployment.

---

## What Can You Build?

With DAO AI Builder, you can create AI agents that:

- 📊 **Answer questions about your data** using natural language
- 🔍 **Search through documents** to find relevant information
- 💬 **Help customers** with product questions and support
- 📈 **Analyze business metrics** from your databases
- 🤝 **Coordinate multiple AI agents** that work together
- 🛡️ **Include safety guardrails** to ensure appropriate responses

**Example:** Build a "Product Expert" agent that can answer questions about your inventory by connecting to your product database and documentation.

---

## How It Works (Simple Version)

Think of DAO AI Builder like a **form builder** for AI agents:

1. **Fill out forms** to describe what you want your AI agent to do
2. **Connect to your data** by selecting databases, documents, or APIs
3. **Preview your configuration** in real-time as you build
4. **Export a file** that contains your complete agent setup
5. **Deploy your agent** to Databricks using the [DAO AI framework](https://github.com/databricks/dao-ai)

**Analogy:** If building an AI agent with code is like building a house from scratch, DAO AI Builder is like using a home design app where you point, click, and configure — then the construction happens automatically.

---

## Quick Start: Get Running in 10 Minutes

Follow these simple steps to run DAO AI Builder on your computer:

### What You'll Need

- A computer with **internet access**
- **Databricks workspace access** (ask your IT team if you're not sure)
- About **10-15 minutes** for first-time setup

### Step-by-Step Setup

#### 1. Install Prerequisites (First Time Only)

You'll need two programs installed on your computer:

**Node.js** (for running the web interface):
- Download from: https://nodejs.org/
- Choose the "LTS" (recommended) version
- Follow the installer instructions
- Verify: Open a terminal and type `node --version` (you should see a version number)

**Python** (for connecting to Databricks):
- Download from: https://www.python.org/downloads/
- Choose version 3.10 or newer
- Follow the installer instructions
- Verify: Open a terminal and type `python --version` (you should see a version number)

> 💡 **Need help?** Ask your IT team to help install Node.js and Python if you're not familiar with this process.

#### 2. Get Your Databricks Connection Info

You'll need two pieces of information from your Databricks workspace:

**Your Workspace URL** — looks like: `https://your-company.cloud.databricks.com`
- Find it in your browser's address bar when you're logged into Databricks

**An Access Token** — a special password for this app
- In Databricks, click your profile icon (top right)
- Go to **Settings** → **Developer** → **Access Tokens**
- Click **Generate New Token**
- Give it a name like "DAO AI Builder"
- Copy the token (you won't see it again!)

#### 3. Download and Run the App

Open a terminal (Command Prompt on Windows, Terminal on Mac) and run these commands:

```bash
# Download the app
git clone https://github.com/natefleming/dao-ai-builder.git
cd dao-ai-builder

# Create a settings file
echo "DATABRICKS_HOST=https://your-workspace.cloud.databricks.com" > .env
echo "DATABRICKS_TOKEN=your-token-here" >> .env
```

> ⚠️ **Important:** Replace `your-workspace.cloud.databricks.com` and `your-token-here` with your actual values!

```bash
# Build and start the app (this will take 2-3 minutes the first time)
cd frontend
npm install
npm run build
cd ..
cp -r frontend/dist static
pip install -r requirements.txt
python app.py
```

#### 4. Open the App in Your Browser

Once you see "Running on http://127.0.0.1:8080", open your web browser and go to:

**http://localhost:8080**

🎉 **You're in!** You should see the DAO AI Builder interface.

### Even Faster Setup (For Next Time)

After your first setup, just run:

```bash
cd dao-ai-builder
python app.py
```

The app will start in seconds!

---

## Using DAO AI Builder: A Guided Tour

### Your First Agent in 5 Steps

#### Step 1: Define Where Your Data Lives

Click on **"Schemas"** in the sidebar and tell the builder where your data is stored in Databricks:

- **Catalog**: The top-level container (like a filing cabinet)
- **Schema**: The specific area (like a drawer in the cabinet)

**Example:** If your sales data is in `company_data.sales_team`, enter:
- Catalog: `company_data`
- Schema: `sales_team`

#### Step 2: Connect to Data Sources

Click on **"Resources"** to add data sources your agent can use:

- **Genie Space**: Natural language interface to your data
- **SQL Warehouse**: Direct access to your databases
- **Vector Search**: For searching through documents
- **Tables**: Specific data tables

Just click **"Browse"** next to each field — the app will show you what's available!

#### Step 3: Create Tools

Tools are actions your agent can take. Click on **"Tools"** and add capabilities:

- **Query a Genie space** to answer questions about data
- **Search documents** to find information
- **Call a SQL warehouse** to run queries
- **Use custom functions** you've created

Most users start with a **Genie Tool** — it's the easiest way to let your agent talk to your data.

#### Step 4: Build Your Agent

Click on **"Agents"** and create your AI assistant:

1. Give it a **name** (like "Sales Assistant" or "Product Expert")
2. Write a **description** of what it should do
3. Choose which **tools** it can use (from Step 3)
4. Write a **prompt** telling it how to behave

**Example Prompt:**
```
You are a friendly sales assistant. Help users find information about 
products, check inventory, and answer pricing questions. Always be 
professional and concise.
```

**Need help writing prompts?** Click the **"Generate with AI"** button and describe what you want — AI will write it for you!

#### Step 5: Export and Deploy

1. Click **"Export YAML"** in the top right corner
2. Save the file (like `my-agent.yaml`)
3. Your configuration is ready!

**To deploy your agent:**

```bash
# Install the DAO AI framework (one time)
pip install dao-ai

# Deploy your agent to Databricks
dao deploy my-agent.yaml
```

Your agent is now live and ready to use! 🚀

---

## Understanding DAO AI vs DAO AI Builder

Many users ask: "What's the difference between these two?"

### Simple Explanation

**DAO AI Builder** (this app) is the **design tool** where you:
- Click buttons and fill out forms
- Visually configure your AI agent
- See a preview of what you're building
- Export a configuration file

**DAO AI** ([github.com/databricks/dao-ai](https://github.com/databricks/dao-ai)) is the **deployment tool** that:
- Takes your configuration file
- Creates the actual AI agent
- Deploys it to Databricks
- Makes it available to users

### Think of It Like This

- **DAO AI Builder** = Microsoft Word (for designing)
- **DAO AI** = The printer (for making it real)

You design in the Builder, export a file, then use DAO AI to deploy it.

### The Complete Picture

```
You → DAO AI Builder → Configuration File (YAML) → DAO AI → Running AI Agent
     (design your agent)  (saves your design)   (deploys it) (on Databricks)
```

**You need both:**
1. Use DAO AI Builder to **design** your agent (visual, easy)
2. Use DAO AI to **deploy** your agent (command line, automated)

### Learn More About DAO AI

- **Main Project**: [github.com/databricks/dao-ai](https://github.com/databricks/dao-ai)
- **Documentation**: [DAO AI Docs](https://github.com/databricks/dao-ai/tree/main/docs)
- **Examples**: [Sample Configurations](https://github.com/databricks/dao-ai/tree/main/config/examples)

---

## Key Features Explained Simply

### 🎨 Visual Interface
**What it means:** No need to write code or edit text files. Everything is buttons, dropdowns, and forms.

**Why it's helpful:** Even if you've never written code, you can build sophisticated AI agents.

### 🤖 AI-Powered Assistance
**What it means:** The app can write prompts and descriptions for you using AI.

**Why it's helpful:** Don't know how to describe what your agent should do? Let AI help you write it.

### 🔗 Databricks Integration
**What it means:** The app automatically connects to your Databricks workspace and shows you available resources.

**Why it's helpful:** No need to manually type catalog names or table names — just browse and select.

### ✅ Real-Time Validation
**What it means:** The app checks your configuration as you build and shows you errors immediately.

**Why it's helpful:** You'll know if something is wrong before you try to deploy, saving time and frustration.

### 📋 Import & Export
**What it means:** You can load existing configurations to edit them, or save your work to share with others.

**Why it's helpful:** Team collaboration and iterative improvements become easy.

---

## Common Questions

### Do I need to know how to code?

**No!** DAO AI Builder is designed for non-programmers. If you can fill out a form and click buttons, you can use this tool.

### What if I make a mistake?

The app validates everything as you go and shows you errors before you export. You can't accidentally create a broken configuration.

### Can I see what my agent will look like before deploying?

Yes! The preview panel on the right side shows you the exact configuration in real-time as you build.

### What if I need help writing prompts?

Click the **"Generate with AI"** button next to any prompt field. Describe what you want, and AI will write it for you. You can then edit it to your liking.

### Can I edit an existing agent configuration?

Absolutely! Click the **"Import"** button, load your existing YAML file, and edit it visually.

### Do I need to understand what "YAML" means?

Not really! YAML is just the format used to save your configuration. The app handles all the technical details — you just fill out forms.

### What happens if I don't have access to Databricks?

You'll need a Databricks workspace to use the full features (browsing catalogs, schemas, etc.). Contact your IT team or Databricks administrator to get access.

---

## Troubleshooting (In Plain English)

### I can't see my Databricks catalogs or schemas

**Problem:** The app isn't connecting to your Databricks workspace.

**Solutions:**
1. Check that your `.env` file has the correct workspace URL and token
2. Make sure your token hasn't expired (generate a new one if needed)
3. Verify you have permission to access Unity Catalog in Databricks
4. Try refreshing the page

**How to check:** Look in your browser's developer console (press F12) for red error messages.

### The "Generate with AI" button doesn't work

**Problem:** Your workspace doesn't have the Claude model endpoint configured.

**Solution:** Contact your Databricks administrator and ask them to enable the `databricks-claude-sonnet-4` endpoint.

### I don't know what to put in a field

**Help available:**
- **Hover over field labels** — most have tooltips with examples
- **Click Browse buttons** — they'll show you available options
- **Check the preview panel** — see how your entries look in the configuration
- **Use AI assistance** — click "Generate with AI" for suggestions

### The app won't start

**Common causes:**

1. **Port already in use**: Another app is using port 8080
   - **Fix:** Close other apps or change the port: `PORT=8081 python app.py`

2. **Python dependencies not installed**: Missing required packages
   - **Fix:** Run `pip install -r requirements.txt` again

3. **Node.js version too old**: You need version 18 or newer
   - **Fix:** Update Node.js from https://nodejs.org/

### Nothing happens when I click buttons

**Problem:** Usually a JavaScript error in the browser.

**Solution:**
1. Open browser developer tools (press F12)
2. Look at the Console tab for red errors
3. Try hard-refreshing the page (Ctrl+Shift+R or Cmd+Shift+R)
4. Clear your browser cache and reload

### Need More Help?

- Check the [DAO AI Documentation](https://github.com/databricks/dao-ai/tree/main/docs)
- Look at [example configurations](https://github.com/databricks/dao-ai/tree/main/config/examples)
- Contact your Databricks administrator
- Open an issue on GitHub with details about your problem

---

## Running DAO AI Builder on Databricks (Optional)

Instead of running on your computer, you can deploy DAO AI Builder directly to your Databricks workspace. This makes it accessible to your whole team through a web URL.

### Why Deploy to Databricks?

- ✅ **Share with your team** — everyone can access it
- ✅ **Automatic authentication** — no need for tokens
- ✅ **Better security** — runs inside your Databricks environment
- ✅ **Always available** — no need to start it on your computer

### Simple Deployment (One Command)

If you have the Databricks CLI installed:

```bash
# Build the frontend
cd frontend && npm install && npm run build && cd ..
cp -r frontend/dist static

# Deploy to your workspace
databricks bundle deploy -t default
```

The app will be available at: `https://your-workspace.cloud.databricks.com/apps/dao-ai-builder`

### What Gets Deployed?

Everything needed to run the app in your Databricks workspace:
- The visual interface (web pages)
- The connection to your Databricks resources
- Authentication (automatic for workspace users)

**Need help?** Ask your Databricks administrator to help with the initial deployment.

---

## What You Can Configure

Here's a simple overview of each section in DAO AI Builder:

| Section | What It Does | Example |
|---------|--------------|---------|
| **Variables** | Store reusable values like API keys or model names | API key for external service |
| **Schemas** | Point to where your data lives in Databricks | Your sales database location |
| **Resources** | Connect to data sources and services | Genie spaces, SQL warehouses, search indexes |
| **Tools** | Define actions your agent can take | Query database, search documents |
| **Agents** | Create your AI assistants | Product expert, sales assistant |
| **Guardrails** | Add safety checks to responses | Filter inappropriate content |
| **Memory** | Store conversation history | Remember what users asked before |
| **Application** | Final settings for deployment | App name, logging level |

**Don't worry about using everything!** Most users only need:
1. Schemas (where is your data?)
2. Resources (what data sources?)
3. Tools (what can your agent do?)
4. Agents (create your AI assistant)
5. Application (deployment settings)

The other sections are optional and for advanced use cases.

---

## Tips for Success

### Start Simple

Your first agent should do **one thing well**:
- ❌ Don't try to build an agent that does 10 different things
- ✅ Start with one capability, like answering questions about a specific dataset

### Use Good Names

Give everything clear, descriptive names:
- ❌ Bad: `agent1`, `tool_a`, `resource_x`
- ✅ Good: `product_expert`, `inventory_search_tool`, `sales_database`

### Write Clear Prompts

Tell your agent exactly what to do:
- ❌ Vague: "Help users"
- ✅ Clear: "Answer questions about product pricing and availability. Be professional and concise. If you don't know something, say so."

### Test Before Deploying

Review your configuration in the preview panel:
- Check for red error indicators
- Make sure all required fields are filled
- Verify tool assignments make sense

### Start with Examples

Look at the [DAO AI example configurations](https://github.com/databricks/dao-ai/tree/main/config/examples) for inspiration. Import them into the builder to see how they're structured!

---

## Next Steps

### After Building Your First Agent

1. **Deploy it** using `dao deploy your-agent.yaml`
2. **Test it** by asking questions and seeing how it responds
3. **Iterate** — edit the configuration and redeploy
4. **Add features** — more tools, guardrails, or additional agents

### Learn More

- **DAO AI Framework**: [github.com/databricks/dao-ai](https://github.com/databricks/dao-ai)
- **DAO AI Documentation**: [Complete guide](https://github.com/databricks/dao-ai/tree/main/docs)
- **Example Configurations**: [Ready-to-use examples](https://github.com/databricks/dao-ai/tree/main/config/examples)

### Get Help

- **Questions?** Open an issue on [GitHub](https://github.com/natefleming/dao-ai-builder/issues)
- **Feedback?** We'd love to hear how you're using DAO AI Builder!
- **Problems?** Check the [Troubleshooting](#troubleshooting-in-plain-english) section above

---

## Technical Details (For Developers)

<details>
<summary>Click to expand technical information</summary>

### Architecture

**Frontend:**
- React 18 with TypeScript
- Vite for fast builds
- Tailwind CSS for styling
- Zustand for state management

**Backend:**
- Flask web server
- Gunicorn for production
- Databricks SDK for workspace integration
- OAuth2 authentication

### Project Structure

```
dao-ai-builder/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── stores/        # State management
│   │   ├── utils/         # YAML generation
│   │   └── types/         # TypeScript types
│   └── package.json
├── static/            # Built frontend (generated)
├── app.py             # Flask backend
├── app.yaml           # Databricks App config
└── requirements.txt   # Python dependencies
```

### Development Mode

```bash
# Frontend with hot reload
cd frontend
npm run dev

# Backend with debug mode
DEBUG=true python app.py
```

### Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style

- TypeScript strict mode
- React functional components
- Python type hints
- ESLint for code quality

</details>

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Ready to build your first AI agent?</strong>
  <br>
  <a href="#quick-start-get-running-in-10-minutes">Get Started Now</a> • <a href="https://github.com/databricks/dao-ai">Learn About DAO AI</a>
</p>

<p align="center">
  <sub>
    Part of the <a href="https://github.com/databricks/dao-ai">DAO AI</a> ecosystem for building production AI agents on Databricks
  </sub>
</p>
