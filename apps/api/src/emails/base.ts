const BASE_STYLE = `
  body { font-family: 'Geist Sans', Inter, -apple-system, sans-serif; background: #fafafa; color: #171717; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
  .card { background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 32px; }
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 16px; letter-spacing: -0.02em; }
  p { font-size: 14px; line-height: 1.6; color: #525252; margin: 0 0 12px; }
  .footer { font-size: 12px; color: #a3a3a3; margin-top: 24px; text-align: center; }
  .badge { display: inline-block; background: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 4px; padding: 4px 8px; font-size: 12px; font-weight: 500; }
  .score { font-size: 28px; font-weight: 600; color: #171717; }
`;

export function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${BASE_STYLE}</style></head>
<body>
  <div class="container">
    <div class="card">${content}</div>
    <p class="footer">Student Information System</p>
  </div>
</body>
</html>`;
}
