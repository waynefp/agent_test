# Phase 12: Vision & Multi-modal

## What You'll Learn

- How Claude processes images
- Image encoding and formats
- Multi-modal input handling
- Building vision-enabled agents
- Token costs for images

## Key Concepts

### Claude Can "See"

Claude is a multi-modal AI - it can process both text AND images.

### What the Agent Can Do

| Capability | Example |
|------------|---------|
| **Describe images** | "What's in this photo?" → Detailed description |
| **Read text (OCR)** | Screenshot of error message → Extracts and explains the text |
| **Analyze code screenshots** | Image of code → Identifies bugs, suggests fixes |
| **Understand diagrams** | Architecture diagram → Explains the data flow |
| **Compare images** | Before/after screenshots → Lists differences |
| **Recreate from screenshots** | Website screenshot → Generates HTML/CSS to match the design |
| **Analyze UI/UX** | App screenshot → Feedback on layout, accessibility |

### What the Agent Cannot Do

| Limitation | Explanation |
|------------|-------------|
| **Generate images** | Claude only outputs text (including code) |
| **Edit images** | Cannot modify or alter images |
| **Identify specific people** | Won't identify individuals by name |

### The "Recreate a Website" Example

A powerful use case - show Claude a screenshot and ask it to recreate the design:

```
/image ./website-screenshot.png Recreate this layout in HTML and CSS
```

Claude will:
1. Analyze the visual layout, colors, spacing, typography
2. Identify components (header, nav, cards, footer)
3. Generate HTML/CSS code that approximates the design

It won't be pixel-perfect, but it understands visual hierarchy, color schemes, and layout patterns well enough to produce a solid starting point.

### How Image Processing Works

```
Image File → Read as bytes → Encode to base64 → Send to API → Claude analyzes
```

The API expects images in this format:

```typescript
{
  type: 'image',
  source: {
    type: 'base64',
    media_type: 'image/jpeg',  // or png, gif, webp
    data: '<base64-encoded-data>'
  }
}
```

### Supported Image Formats

| Format | Media Type | Notes |
|--------|------------|-------|
| JPEG | `image/jpeg` | Best for photos |
| PNG | `image/png` | Best for screenshots, diagrams |
| GIF | `image/gif` | Static GIFs only (first frame) |
| WebP | `image/webp` | Modern format, good compression |

### Image Size Limits

- **Maximum**: 20 MB per image
- **Recommended**: Keep under 5 MB for faster processing
- **Resolution**: Claude handles up to ~1568x1568 pixels (larger images are resized)

## Using Vision in Your Agent

### Basic Image Chat

```typescript
// Send a single image with a question
const response = await agent.chatWithImage(
  './screenshot.png',
  'What errors do you see in this code?'
);
```

### Multiple Images

```typescript
// Compare two images
const response = await agent.chatWithImages(
  ['./before.png', './after.png'],
  'What changed between these two screenshots?'
);
```

### Streaming Response

```typescript
// Stream the response as it's generated
await agent.chatWithImageStream(
  './diagram.png',
  'Explain this architecture diagram',
  {
    onText: (chunk) => process.stdout.write(chunk),
    onComplete: (fullText) => console.log('\nDone!'),
  }
);
```

### Inspect Before Sending

```typescript
// Check image details without sending to Claude
const info = await agent.inspectImage('./large-photo.jpg');
console.log(`Size: ${info.sizeBytes} bytes`);
console.log(`Estimated tokens: ${info.estimatedTokens}`);
```

## CLI Commands

### Send an Image

```bash
# Basic - just send an image
/image ./photo.jpg

# With a question
/image ./diagram.png What does this show?

# From a URL
/image https://example.com/image.png Describe this
```

### Inspect an Image

```bash
# Check size and token cost without sending
/image info ./large-file.png
```

## Token Costs for Images

Images cost tokens! The cost depends on image dimensions:

| Image Size | Approximate Tokens |
|------------|-------------------|
| Small (up to 512x512) | ~85-170 tokens |
| Medium (up to 1024x1024) | ~170-680 tokens |
| Large (up to 1568x1568) | ~680-1590 tokens |

**Formula**: `tokens ≈ (width × height) / 750`

### Cost Optimization Tips

1. **Resize large images** - Shrink before sending if high resolution isn't needed
2. **Crop to relevant area** - Don't send full screenshots if only part matters
3. **Use JPEG for photos** - Better compression than PNG
4. **Use PNG for text/diagrams** - Clearer for things with sharp edges

## Image Utilities

### Loading Images

```typescript
import { loadImage, loadImageFromFile, loadImageFromUrl } from './utils/image.js';

// Automatically detects file vs URL
const image = await loadImage('./photo.jpg');
const urlImage = await loadImage('https://example.com/image.png');

// Or be explicit
const fileImage = await loadImageFromFile('./photo.jpg');
const webImage = await loadImageFromUrl('https://example.com/image.png');
```

### Converting to API Format

```typescript
import { toImageContent, loadImageAsContent } from './utils/image.js';

// Two-step: load then convert
const image = await loadImage('./photo.jpg');
const content = toImageContent(image);

// One-step: load and convert
const content = await loadImageAsContent('./photo.jpg');
```

### Getting Media Type

```typescript
import { getMediaTypeFromPath, isSupportedImageType } from './utils/image.js';

const mediaType = getMediaTypeFromPath('./photo.jpg');  // 'image/jpeg'
const isValid = isSupportedImageType('./video.mp4');    // false
```

## Multi-Modal Messages

### Structure of a Message with Images

```typescript
// A message can contain multiple content blocks
const message = {
  role: 'user',
  content: [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: '<base64-data>'
      }
    },
    {
      type: 'text',
      text: 'What is shown in this image?'
    }
  ]
};
```

### Order Matters

Put images **before** text when asking about them:

```typescript
// Good: image first, question after
content: [imageContent, { type: 'text', text: 'Describe this' }]

// Also works: question first
content: [{ type: 'text', text: 'Describe this' }, imageContent]
```

### Multiple Images

```typescript
// Send multiple images in one message
content: [
  image1Content,
  image2Content,
  { type: 'text', text: 'Compare these two images' }
]
```

## Best Practices

### 1. Always Include Context

Don't just send an image - tell Claude what you want:

```typescript
// Not great - Claude doesn't know what you want
await agent.chatWithImage('./code.png');

// Better - clear instruction
await agent.chatWithImage(
  './code.png',
  'Review this code for bugs and security issues'
);
```

### 2. Handle Errors Gracefully

```typescript
try {
  const response = await agent.chatWithImage('./image.png', 'Describe this');
} catch (error) {
  if (error.message.includes('not found')) {
    console.log('Image file not found');
  } else if (error.message.includes('too large')) {
    console.log('Image exceeds 20MB limit');
  } else if (error.message.includes('Unsupported')) {
    console.log('Invalid image format');
  }
}
```

### 3. Consider Token Budget

Images can use significant tokens. Account for this:

```typescript
const info = await agent.inspectImage('./image.png');
const imageTokens = info.estimatedTokens;
const remainingBudget = maxTokens - imageTokens;

if (imageTokens > 1000) {
  console.log('Warning: This image will use ~${imageTokens} tokens');
}
```

### 4. Use Appropriate Formats

| Content | Best Format |
|---------|-------------|
| Photos | JPEG |
| Screenshots | PNG |
| Diagrams | PNG or SVG (as PNG) |
| Text documents | PNG (for clarity) |
| Web graphics | WebP |

## Exercises

### Exercise 1: Image Description

Create a function that describes any image:

```typescript
async function describeImage(path: string): Promise<string> {
  // Load the image
  // Send to Claude with "Describe this image in detail"
  // Return the description
}
```

### Exercise 2: Compare Images

Create a function that compares two images:

```typescript
async function compareImages(
  path1: string,
  path2: string
): Promise<{ similarities: string[], differences: string[] }> {
  // Send both images to Claude
  // Ask for similarities and differences
  // Parse the response into structured format
}
```

### Exercise 3: Image Tool

Create a tool that lets the agent analyze images:

```typescript
class ImageAnalysisTool extends BaseTool {
  name = 'analyze_image';

  // Input: image path, analysis type (describe, ocr, count_objects)
  // Output: analysis result
}
```

## Common Use Cases

### 1. Screenshot Analysis

```typescript
await agent.chatWithImage(
  './error-screenshot.png',
  'I got this error. What does it mean and how do I fix it?'
);
```

### 2. Document OCR

```typescript
await agent.chatWithImage(
  './receipt.jpg',
  'Extract the total amount and date from this receipt'
);
```

### 3. Code Review

```typescript
await agent.chatWithImage(
  './code-snippet.png',
  'Review this code for potential issues'
);
```

### 4. Diagram Understanding

```typescript
await agent.chatWithImage(
  './architecture.png',
  'Explain the data flow in this architecture diagram'
);
```

### 5. UI Feedback

```typescript
await agent.chatWithImages(
  ['./mockup.png', './implementation.png'],
  'Does the implementation match the mockup? What differences do you see?'
);
```

## Quick Reference

### Image Loading Functions

| Function | Description |
|----------|-------------|
| `loadImage(source)` | Load from file or URL (auto-detect) |
| `loadImageFromFile(path)` | Load from local file |
| `loadImageFromUrl(url)` | Load from URL |
| `loadImageAsContent(source)` | Load and convert to API format |

### Agent Methods

| Method | Description |
|--------|-------------|
| `chatWithImage(path, question)` | Send single image |
| `chatWithImages(paths, question)` | Send multiple images |
| `chatWithImageStream(path, question, callbacks)` | Stream response |
| `inspectImage(path)` | Get image info without sending |

### CLI Commands

| Command | Description |
|---------|-------------|
| `/image <path>` | Send image with default prompt |
| `/image <path> <question>` | Send image with question |
| `/image info <path>` | Inspect image details |
| `/image help` | Show image command help |

### Supported Formats

- `.jpg`, `.jpeg` → `image/jpeg`
- `.png` → `image/png`
- `.gif` → `image/gif`
- `.webp` → `image/webp`

## What's Next?

In **Phase 13 (Skills System)**, you'll learn to:
- Define agent behaviors in skill files
- Load skills dynamically
- Create modular, reusable agent capabilities
- Combine vision with other skills

The vision capabilities you learned here can be combined with skills to create specialized image analysis agents!
