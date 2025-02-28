// "use client";

// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Textarea } from "@/components/ui/textarea";
// import { Checkbox } from "@/components/ui/checkbox";
// import { CalendarIcon, CheckCircle, Loader2 } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { format } from "date-fns";
// import { Calendar } from "@/components/ui/calendar";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";

// export default function OnboardingFlow() {
//   // State for tracking the current step
//   const [step, setStep] = useState(0);

//   // State for loading animation between steps
//   const [loading, setLoading] = useState(false);

//   // Form data state
//   const [formData, setFormData] = useState({
//     name: "",
//     birthday: undefined as Date | undefined,
//     dream: "",
//     dreamType: "successful-career",
//     interests: [] as string[],
//     bio: "",
//     notifications: false,
//   });

//   // Total number of steps
//   const totalSteps = 5;

//   // Handle input changes
//   const handleChange = (field: string, value: any) => {
//     setFormData((prev) => ({ ...prev, [field]: value }));
//   };

//   // Handle interest selection
//   const handleInterestToggle = (interest: string) => {
//     setFormData((prev) => {
//       const interests = [...prev.interests];
//       if (interests.includes(interest)) {
//         return { ...prev, interests: interests.filter((i) => i !== interest) };
//       } else {
//         return { ...prev, interests: [...interests, interest] };
//       }
//     });
//   };

//   // Handle next step
//   const handleNext = () => {
//     if (step < totalSteps - 1) {
//       setLoading(true);
//       setTimeout(() => {
//         setStep(step + 1);
//         setLoading(false);
//       }, 800);
//     }
//   };

//   // Handle previous step
//   const handlePrevious = () => {
//     if (step > 0) {
//       setStep(step - 1);
//     }
//   };

//   // Handle form submission
//   const handleSubmit = () => {
//     setLoading(true);
//     setTimeout(() => {
//       setLoading(false);
//       alert("Onboarding completed! Data submitted successfully.");
//       console.log("Form data:", formData);
//       // Here you would typically send the data to your backend
//     }, 1500);
//   };

//   // Check if current step is valid to proceed
//   const isStepValid = () => {
//     switch (step) {
//       case 0: // Welcome screen
//         return true;
//       case 1: // Basic info
//         return formData.name.trim() !== "" && formData.birthday !== undefined;
//       case 2: // Dreams
//         return formData.dream.trim() !== "";
//       case 3: // Interests
//         return formData.interests.length > 0;
//       case 4: // Bio
//         return formData.bio.trim() !== "";
//       default:
//         return false;
//     }
//   };

//   // Render the welcome screen
//   const renderWelcome = () => (
//     <Card className="w-full max-w-md mx-auto">
//       <CardHeader className="text-center">
//         <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
//           <CheckCircle className="h-6 w-6 text-primary-foreground" />
//         </div>
//         <CardTitle className="text-2xl">Meet Your New Best Friend</CardTitle>
//         <CardDescription className="text-lg">
//           Always Here and Listening!
//         </CardDescription>
//       </CardHeader>
//       <CardContent className="text-center">
//         <p className="text-muted-foreground">
//           Whether you need a chat, a laugh, or a little motivation, your friend
//           is just a message away.
//         </p>
//       </CardContent>
//       <CardFooter className="flex justify-center">
//         <Button onClick={handleNext} className="w-32">
//           Get Started
//         </Button>
//       </CardFooter>
//     </Card>
//   );

//   // Render the basic info form
//   const renderBasicInfo = () => (
//     <Card className="w-full max-w-md mx-auto">
//       <CardHeader>
//         <CardTitle>Tell us about yourself</CardTitle>
//         <CardDescription>
//           We need some basic information to get started
//         </CardDescription>
//       </CardHeader>
//       <CardContent className="space-y-4">
//         <div className="space-y-2">
//           <Label htmlFor="name">What's your name?</Label>
//           <Input
//             id="name"
//             placeholder="Enter your full name"
//             value={formData.name}
//             onChange={(e) => handleChange("name", e.target.value)}
//           />
//         </div>
//         <div className="space-y-2">
//           <Label htmlFor="birthday">When's your birthday?</Label>
//           <Popover>
//             <PopoverTrigger asChild>
//               <Button
//                 variant="outline"
//                 className={cn(
//                   "w-full justify-start text-left font-normal",
//                   !formData.birthday && "text-muted-foreground"
//                 )}
//               >
//                 <CalendarIcon className="mr-2 h-4 w-4" />
//                 {formData.birthday
//                   ? format(formData.birthday, "PPP")
//                   : "Select your birthday"}
//               </Button>
//             </PopoverTrigger>
//             <PopoverContent className="w-auto p-0">
//               <Calendar
//                 mode="single"
//                 selected={formData.birthday}
//                 onSelect={(date) => handleChange("birthday", date)}
//                 initialFocus
//               />
//             </PopoverContent>
//           </Popover>
//         </div>
//       </CardContent>
//       <CardFooter className="flex justify-between">
//         <Button variant="outline" onClick={handlePrevious}>
//           Back
//         </Button>
//         <Button onClick={handleNext} disabled={!isStepValid()}>
//           Next
//         </Button>
//       </CardFooter>
//     </Card>
//   );

//   // Render the dreams form
//   const renderDreams = () => (
//     <Card className="w-full max-w-md mx-auto">
//       <CardHeader>
//         <CardTitle>What's your dream in life?</CardTitle>
//         <CardDescription>Tell us what you aspire to achieve</CardDescription>
//       </CardHeader>
//       <CardContent className="space-y-4">
//         <div className="space-y-2">
//           <Label htmlFor="dream">Describe your dream</Label>
//           <Textarea
//             id="dream"
//             placeholder="I want to..."
//             value={formData.dream}
//             onChange={(e) => handleChange("dream", e.target.value)}
//             className="min-h-[100px]"
//           />
//         </div>
//         <div className="space-y-2">
//           <Label>What type of dream is this?</Label>
//           <RadioGroup
//             value={formData.dreamType}
//             onValueChange={(value) => handleChange("dreamType", value)}
//             className="flex flex-wrap gap-2"
//           >
//             <div className="flex items-center space-x-2 bg-muted/50 px-3 py-2 rounded-full">
//               <RadioGroupItem value="successful-career" id="career" />
//               <Label htmlFor="career" className="cursor-pointer">
//                 Successful career
//               </Label>
//             </div>
//             <div className="flex items-center space-x-2 bg-muted/50 px-3 py-2 rounded-full">
//               <RadioGroupItem value="financial-freedom" id="financial" />
//               <Label htmlFor="financial" className="cursor-pointer">
//                 Financial freedom
//               </Label>
//             </div>
//             <div className="flex items-center space-x-2 bg-muted/50 px-3 py-2 rounded-full">
//               <RadioGroupItem value="world-exploration" id="travel" />
//               <Label htmlFor="travel" className="cursor-pointer">
//                 World exploration
//               </Label>
//             </div>
//           </RadioGroup>
//         </div>
//       </CardContent>
//       <CardFooter className="flex justify-between">
//         <Button variant="outline" onClick={handlePrevious}>
//           Back
//         </Button>
//         <Button onClick={handleNext} disabled={!isStepValid()}>
//           Next
//         </Button>
//       </CardFooter>
//     </Card>
//   );

//   // Render the interests form
//   const renderInterests = () => {
//     const interests = [
//       "Technology",
//       "Art",
//       "Music",
//       "Sports",
//       "Reading",
//       "Travel",
//       "Cooking",
//       "Gaming",
//       "Nature",
//       "Movies",
//       "Science",
//       "Photography",
//     ];

//     return (
//       <Card className="w-full max-w-md mx-auto">
//         <CardHeader>
//           <CardTitle>What are your interests?</CardTitle>
//           <CardDescription>Select all that apply to you</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-2 gap-3">
//             {interests.map((interest) => (
//               <div
//                 key={interest}
//                 className={cn(
//                   "flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors",
//                   formData.interests.includes(interest)
//                     ? "border-primary bg-primary/10"
//                     : "border-input hover:bg-muted/50"
//                 )}
//                 onClick={() => handleInterestToggle(interest)}
//               >
//                 <Checkbox
//                   checked={formData.interests.includes(interest)}
//                   onCheckedChange={() => handleInterestToggle(interest)}
//                   id={`interest-${interest}`}
//                 />
//                 <Label
//                   htmlFor={`interest-${interest}`}
//                   className="cursor-pointer flex-1"
//                 >
//                   {interest}
//                 </Label>
//               </div>
//             ))}
//           </div>
//         </CardContent>
//         <CardFooter className="flex justify-between">
//           <Button variant="outline" onClick={handlePrevious}>
//             Back
//           </Button>
//           <Button onClick={handleNext} disabled={!isStepValid()}>
//             Next
//           </Button>
//         </CardFooter>
//       </Card>
//     );
//   };

//   // Render the bio form
//   const renderBio = () => (
//     <Card className="w-full max-w-md mx-auto">
//       <CardHeader>
//         <CardTitle>Tell us more about yourself</CardTitle>
//         <CardDescription>
//           This will help us personalize your experience
//         </CardDescription>
//       </CardHeader>
//       <CardContent className="space-y-4">
//         <div className="space-y-2">
//           <Label htmlFor="bio">Write a short bio</Label>
//           <Textarea
//             id="bio"
//             placeholder="I am..."
//             value={formData.bio}
//             onChange={(e) => handleChange("bio", e.target.value)}
//             className="min-h-[120px]"
//           />
//         </div>
//         <div className="flex items-center space-x-2">
//           <Checkbox
//             id="notifications"
//             checked={formData.notifications}
//             onCheckedChange={(checked) =>
//               handleChange("notifications", checked)
//             }
//           />
//           <Label htmlFor="notifications" className="cursor-pointer">
//             I want to receive notifications and updates
//           </Label>
//         </div>
//       </CardContent>
//       <CardFooter className="flex justify-between">
//         <Button variant="outline" onClick={handlePrevious}>
//           Back
//         </Button>
//         <Button onClick={handleSubmit}>Submit</Button>
//       </CardFooter>
//     </Card>
//   );

//   // Render loading state
//   const renderLoading = () => (
//     <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
//       <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
//         <Loader2 className="h-6 w-6 text-primary animate-spin" />
//       </div>
//       <p className="text-muted-foreground">Loading...</p>
//       <div className="flex space-x-2">
//         <div
//           className="h-2 w-2 bg-primary rounded-full animate-bounce"
//           style={{ animationDelay: "0ms" }}
//         ></div>
//         <div
//           className="h-2 w-2 bg-primary rounded-full animate-bounce"
//           style={{ animationDelay: "300ms" }}
//         ></div>
//         <div
//           className="h-2 w-2 bg-primary rounded-full animate-bounce"
//           style={{ animationDelay: "600ms" }}
//         ></div>
//       </div>
//     </div>
//   );

//   // Render progress indicator
//   const renderProgress = () => (
//     <div className="w-full max-w-md mx-auto mb-6">
//       <div className="flex items-center justify-between">
//         {Array.from({ length: totalSteps }).map((_, index) => (
//           <div key={index} className="flex items-center">
//             {index > 0 && (
//               <div
//                 className={cn(
//                   "h-[2px] w-12 -mx-1",
//                   index <= step ? "bg-primary" : "bg-muted"
//                 )}
//               />
//             )}
//             <div
//               className={cn(
//                 "rounded-full h-2 w-2",
//                 index < step
//                   ? "bg-primary"
//                   : index === step
//                   ? "bg-primary"
//                   : "bg-muted"
//               )}
//             />
//           </div>
//         ))}
//       </div>
//     </div>
//   );

//   // Render the current step
//   const renderStep = () => {
//     if (loading) {
//       return renderLoading();
//     }

//     switch (step) {
//       case 0:
//         return renderWelcome();
//       case 1:
//         return renderBasicInfo();
//       case 2:
//         return renderDreams();
//       case 3:
//         return renderInterests();
//       case 4:
//         return renderBio();
//       default:
//         return null;
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-4">
//       {step > 0 && renderProgress()}
//       {renderStep()}
//     </div>
//   );
// }
