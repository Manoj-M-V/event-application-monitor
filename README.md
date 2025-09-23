npm run dev

npx prisma studio

npx prisma db push



NEXT_PUBLIC_APP_URL=http://localhost:3000

# DATABASE - In the video, this comes from Neon Postgres (neon.tech)
DATABASE_URL=postgresql://neondb_owner:npg_m0q6wgHIcJEx@ep-hidden-darkness-a80yzlvp-pooler.eastus2.azure.neon.tech/neondb?sslmode=require

# AUTH - These come from clerk (https://link.joshtriedcoding.com/clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZHJpdmluZy1tb2xsdXNrLTUwLmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_NJKpWK0AxWxETFyBSOY2dUi4sOvrp33AYmQ0sQPdEj

# DISCORD - This comes from discord as shown in video
DISCORD_BOT_TOKEN=MTM4MjQxMDk2MzQ1NzgwNjM4Ng.GGEgpo.44IH2CTzwshtiR96XFwGgCOXlBBtLTV2XkToIA

# PAYMENTS - This comes from stripe as shown in video
STRIPE_SECRET_KEY=sk_test_51NKETpSAs2gIl6CZhrxPiDPzsFIEixe080hXznwui32PFXcZh3SHoemDrCoLWvkMWMiGmSc44YaPHH7EG79nNC7l00KgWeBK3x





git add .
git commit -m 'readme update'
git push -u major main