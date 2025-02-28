// import NextAuth, { NextAuthOptions } from "next-auth";
// import GoogleProvider from "next-auth/providers/google";
// import { FirestoreAdapter } from "@auth/firebase-adapter";

// export const authOptions: NextAuthOptions = {
//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     }),
//   ],
//   adapter: FirestoreAdapter(),
//   secret: process.env.NEXTAUTH_SECRET,
//   session: {
//     strategy: "jwt",
//   },
//   callbacks: {
    
//     async session({ session, token }) {
//       if (session.user) {
//         session.user.uid = token.sub!;
//       }
//       return session;
//     },
//   },
// };

// export default NextAuth(authOptions);
