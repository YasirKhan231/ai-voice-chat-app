// import { signIn, useSession } from "next-auth/react";

// export default function Home() {
//   const { data: session } = useSession();

//   return (
//     <div>
//       {session ? (
//         <>
//           <p>Welcome, {session.user?.name}!</p>
//           <button onClick={() => signOut()}>Sign Out</button>
//         </>
//       ) : (
//         <button onClick={() => signIn("google")}>Sign in with Google</button>
//       )}
//     </div>
//   );
// }