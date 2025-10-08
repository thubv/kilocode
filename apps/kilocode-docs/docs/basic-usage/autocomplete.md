---
title: Autocomplete
sidebar_position: 4
---

# Autocomplete

Kilo Code's autocomplete feature provides intelligent code suggestions and completions while you're typing, helping you write code faster and more efficiently. It offers both automatic and manual triggering options.

## How Autocomplete Works

Autocomplete analyzes your code context and provides:

- **Inline completions** as you type
- **Quick fixes** for common code patterns
- **Contextual suggestions** based on your surrounding code
- **Multi-line completions** for complex code structures

The feature uses your selected AI provider to generate intelligent suggestions that match your coding style and project context.

## Triggering Options

### Pause to Complete

When enabled, Kilo Code automatically triggers autocomplete when you pause typing. This provides a seamless coding experience where suggestions appear naturally as you work.

- **Auto Trigger Delay**: Configure the delay (in seconds) before autocomplete triggers after you stop typing
- Default is 3 seconds, but this can be adjusted up or down
- Shorter delays mean quicker suggestions but may be more resource-intensive

### Quick Task (Cmd+I)

Need to make a quick change? The Quick Task feature allows you to:

1. Select code in your editor (or place your cursor where you want changes)
2. Press `Cmd+I` (Mac) or `Ctrl+I` (Windows/Linux)
3. Describe your goal in plain English
4. Receive a code suggestion without going to the chat

**Examples:**

- "create a React component with these props"
- "add error handling to this function"
- "convert this to TypeScript"
- "optimize this loop for performance"

You can customize the keyboard shortcut in VS Code's keyboard shortcuts settings.

### Manual Autocomplete (Cmd+L)

For more control over when suggestions appear:

1. Position your cursor where you need assistance
2. Press `Cmd+L` (Mac) or `Ctrl+L` (Windows/Linux)
3. Kilo Code analyzes the surrounding context
4. Receive immediate improvements or completions

This is ideal for:

- Quick fixes
- Code completions
- Refactoring suggestions
- Keeping you in the flow without interruptions

You can customize this keyboard shortcut as well in your VS Code settings.

## Advanced Settings

### Provider Configuration

By default, autocomplete uses your main Kilo Code/OpenRouter/Mistral credentials with the Codestral model.
This model is recommended as it strikes an optimal balance between performance speed and capability.
However, you can:

- **Use custom provider**: Toggle this option to use a different AI provider specifically for autocomplete
- **Select different models**: Choose models optimized for speed vs. quality based on your needs

## Best Practices

1. **Balance speed and quality**: Faster models provide quicker suggestions but may be less accurate
2. **Adjust trigger delay**: Find the sweet spot between responsiveness and avoiding too many API calls
3. **Use Quick Task for complex changes**: It's designed for more substantial code modifications
4. **Use Manual Autocomplete for precision**: When you need suggestions at specific moments
5. **Configure providers wisely**: Consider using faster, cheaper models for autocomplete while keeping more powerful models for chat

## Tips

- Autocomplete works best with clear, well-structured code
- Comments above functions help autocomplete understand intent
- Variable and function names matter - descriptive names lead to better suggestions

## Related Features

- [Code Actions](../features/code-actions) - Context menu options for common coding tasks
