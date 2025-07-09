# 🧬 LLM Alchemy

An AI-powered element combination game where players discover new elements by mixing existing ones. Choose between Science mode for realistic combinations or Creative mode for imaginative results!

![LLM Alchemy Game](https://img.shields.io/badge/Game-LLM%20Alchemy-purple)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-cyan)

## 🎮 Features

- **Two Game Modes**: Science (realistic) and Creative (imaginative) combinations
- **AI-Powered Generation**: Uses OpenRouter API with Gemini Flash for dynamic element creation
- **Achievement System**: Unlock achievements based on your discoveries
- **Mobile-Friendly**: Touch controls and responsive design
- **Real-time Mixing**: Drag and drop elements to create new combinations
- **Reasoning Display**: See why certain combinations work

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **LLM API**: OpenRouter (Gemini 2.5 Flash)
- **Hosting**: Vercel
- **Styling**: Tailwind CSS with custom animations

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- OpenRouter API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Farsinuce/LLM-Alchemy.git
cd LLM-Alchemy/llm-alchemy
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Add your OpenRouter API key to `.env.local`:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play the game!

## 🎯 How to Play

1. **Choose Your Mode**: Toggle between Science and Creative modes
2. **Drag Elements**: Drag elements from the top list to the mixing area
3. **Combine Elements**: Drop one element onto another to mix them
4. **Discover New Elements**: Successful combinations create new elements with AI-generated properties
5. **Collect Achievements**: Unlock achievements by discovering different types of elements

### Game Modes

- **🔬 Science Mode**: Realistic combinations based on scientific principles
  - Features "Energy" element for chemical reactions
  - Creates "End Elements" that can't be combined further
  - Focus on real-world chemistry and physics

- **🎨 Creative Mode**: Imaginative combinations from mythology, culture, and creativity
  - Features "Life" element instead of Energy
  - Allows more fantastical and creative outcomes
  - Draw from folklore, pop culture, and imagination

## 📁 Project Structure

```
llm-alchemy/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── api/generate/     # LLM API endpoint
│   │   ├── game/            # Game page
│   │   └── page.tsx         # Home page
│   └── components/
│       └── game/
│           └── LLMAlchemy.tsx # Main game component
├── public/                   # Static assets
└── package.json
```

## 🔧 API

The game uses a single API endpoint:

### POST `/api/generate`

Generates new element combinations using AI.

**Request:**
```json
{
  "prompt": "Generated prompt with context",
  "gameMode": "science" | "creative"
}
```

**Response:**
```json
{
  "result": "Element Name" | null,
  "emoji": "🔥",
  "color": "#FF4500",
  "rarity": "common" | "uncommon" | "rare",
  "reasoning": "Brief explanation",
  "tags": ["category1", "category2"],
  "isEndElement": false
}
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `OPENROUTER_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (your production URL)
4. Deploy automatically!

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Yes |
| `NEXT_PUBLIC_APP_URL` | Your app's URL (for OpenRouter referrer) | Yes |

## 🎮 Gameplay Mechanics

- **Element Discovery**: Each successful combination unlocks a new element
- **Rarity System**: Elements can be common (60%), uncommon (30%), or rare (10%)
- **Session Caching**: Combinations are cached during your session to prevent duplicates
- **Achievement Tracking**: Tag-based achievements unlock as you discover elements
- **Mobile Support**: Full touch support with drag/drop and tap interactions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai) for LLM API access
- [Next.js](https://nextjs.org) for the amazing React framework
- [Tailwind CSS](https://tailwindcss.com) for utility-first styling
- [Lucide React](https://lucide.dev) for beautiful icons

---

**🎮 Start your alchemical journey today!** Mix elements, discover new combinations, and unlock the secrets of creation with the power of AI.
