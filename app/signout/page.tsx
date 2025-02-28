// import { signOut, useSession } from "next-auth/react";

// const Signout = () => {
//   const { data: session } = useSession();

//   return (
//     <div className="flex flex-col items-center justify-center h-screen">
//       {session ? (
//         <>
//           <h1 className="mb-4 text-lg font-bold">
//             Welcome, {session.user?.name}!
//           </h1>
//           <button
//             onClick={() => signOut()}
//             className="px-6 py-3 text-white bg-red-500 rounded-lg"
//           >
//             Sign Out
//           </button>
//         </>
//       ) : (
//         <a
//           href="/signin"
//           className="px-6 py-3 text-white bg-blue-500 rounded-lg"
//         >
//           Sign In
//         </a>
//       )}
//     </div>
//   );
// };

// export default Home;
