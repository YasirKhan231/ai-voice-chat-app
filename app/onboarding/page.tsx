"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { auth, db } from "../firebase/firebaseConfig"; // Import Firebase auth and Firestore
import { doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null); // Store the authenticated user

  // Form data state
  const [formData, setFormData] = useState({
    name: "",
    birthday: undefined as Date | undefined,
    dream: "",
    dreamType: "successful-career",
    interests: [] as string[],
    notifications: false,
  });

  const totalSteps = 3;

  // Check if the user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user); // Set the authenticated user
      } else {
        router.push("/signin"); // Redirect to sign-in if not authenticated
      }
    });

    return () => unsubscribe(); // Cleanup subscription
  }, [router]);

  // Handle input changes
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle interest selection
  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => {
      const interests = [...prev.interests];
      if (interests.includes(interest)) {
        return { ...prev, interests: interests.filter((i) => i !== interest) };
      } else {
        return { ...prev, interests: [...interests, interest] };
      }
    });
  };

  // Handle next step
  const handleNext = () => {
    if (step < totalSteps - 1) {
      setLoading(true);
      setTimeout(() => {
        setStep(step + 1);
        setLoading(false);
      }, 800);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    setLoading(true);

    try {
      // Store onboarding data in Firestore under the user's document
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          onboarding: {
            ...formData,
            birthday: formData.birthday?.toISOString(), // Convert date to string
          },
        },
        { merge: true } // Merge with existing data
      );

      console.log("Onboarding data saved successfully!");
      router.push("/"); // Redirect to home page after submission
    } catch (error) {
      console.error("Error saving onboarding data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check if current step is valid to proceed
  const isStepValid = () => {
    switch (step) {
      case 0:
        return formData.name.trim() !== "" && formData.birthday !== undefined;
      case 1:
        return formData.dream.trim() !== "";
      case 2:
        return formData.interests.length > 0;
      default:
        return false;
    }
  };

  // Render the basic info form (Step 1)
  const renderBasicInfo = () => (
    <Card className="w-full max-w-md mx-auto shadow-md border-neutral-200">
      <CardHeader className="bg-neutral-50 border-b border-neutral-200 rounded-t-lg">
        <CardTitle className="text-xl text-center">
          Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label htmlFor="name">What's your name?</Label>
          <Input
            id="name"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="border-neutral-300 focus:border-neutral-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthday">When's your birthday?</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal border-neutral-300",
                  !formData.birthday && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.birthday
                  ? format(formData.birthday, "PPP")
                  : "Select your birthday"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.birthday}
                onSelect={(date) => handleChange("birthday", date)}
                initialFocus
                fromYear={1900}
                toYear={new Date().getFullYear()}
                captionLayout="dropdown-buttons"
                className="rounded-md border bg-amber-100"
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end pt-2 pb-4 px-6 bg-neutral-50 border-t border-neutral-200 rounded-b-lg">
        <Button
          onClick={handleNext}
          disabled={!isStepValid()}
          className="bg-neutral-800 text-white hover:bg-neutral-700 hover:cursor-pointer"
        >
          Next
        </Button>
      </CardFooter>
    </Card>
  );

  // Render the dreams form (Step 2)
  const renderDreams = () => (
    <Card className="w-full max-w-md mx-auto shadow-md border-neutral-200">
      <CardHeader className="bg-neutral-50 border-b border-neutral-200 rounded-t-lg">
        <CardTitle className="text-xl text-center">Your Aspirations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label htmlFor="dream">Describe your dream</Label>
          <Textarea
            id="dream"
            placeholder="I want to..."
            value={formData.dream}
            onChange={(e) => handleChange("dream", e.target.value)}
            className="min-h-[100px] border-neutral-300 focus:border-neutral-500"
          />
        </div>
        <div className="space-y-2">
          <Label>What type of dream is this?</Label>
          <RadioGroup
            value={formData.dreamType}
            onValueChange={(value) => handleChange("dreamType", value)}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-neutral-100">
              <RadioGroupItem value="successful-career" id="career" />
              <Label htmlFor="career" className="cursor-pointer">
                Successful career
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-neutral-100">
              <RadioGroupItem value="financial-freedom" id="financial" />
              <Label htmlFor="financial" className="cursor-pointer">
                Financial freedom
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-neutral-100">
              <RadioGroupItem value="world-exploration" id="travel" />
              <Label htmlFor="travel" className="cursor-pointer">
                World exploration
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2 pb-4 px-6 bg-neutral-50 border-t border-neutral-200 rounded-b-lg">
        <Button
          variant="outline"
          onClick={handlePrevious}
          className="border-neutral-300 hover:bg-neutral-100"
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isStepValid()}
          className="bg-neutral-800 text-white hover:bg-neutral-700 hover:cursor-pointer"
        >
          Next
        </Button>
      </CardFooter>
    </Card>
  );

  // Render the interests form (Step 3)
  const renderInterests = () => {
    const interests = [
      "Technology",
      "Art",
      "Music",
      "Sports",
      "Reading",
      "Travel",
      "Cooking",
      "Gaming",
    ];

    return (
      <Card className="w-full max-w-md mx-auto shadow-md border-neutral-200">
        <CardHeader className="bg-neutral-50 border-b border-neutral-200 rounded-t-lg">
          <CardTitle className="text-xl text-center">Your Interests</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-3">
            {interests.map((interest) => (
              <div
                key={interest}
                className={cn(
                  "flex items-center space-x-2 border rounded-md p-3 cursor-pointer transition-colors",
                  formData.interests.includes(interest)
                    ? "border-neutral-800 bg-neutral-100"
                    : "border-neutral-300 hover:bg-neutral-50"
                )}
                onClick={() => handleInterestToggle(interest)}
              >
                <Checkbox
                  checked={formData.interests.includes(interest)}
                  onCheckedChange={() => handleInterestToggle(interest)}
                  id={`interest-${interest}`}
                  className="border-neutral-400"
                />
                <Label
                  htmlFor={`interest-${interest}`}
                  className="cursor-pointer flex-1"
                >
                  {interest}
                </Label>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center space-x-2">
            <Checkbox
              id="notifications"
              checked={formData.notifications}
              onCheckedChange={(checked: any) =>
                handleChange("notifications", checked)
              }
              className="border-neutral-400"
            />
            <Label htmlFor="notifications" className="cursor-pointer">
              I want to receive notifications and updates
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2 pb-4 px-6 bg-neutral-50 border-t border-neutral-200 rounded-b-lg">
          <Button
            variant="outline"
            onClick={handlePrevious}
            className="border-neutral-300 hover:bg-neutral-100"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isStepValid()}
            className="bg-neutral-800 text-white hover:bg-neutral-700 hover:cursor-pointer"
          >
            Submit
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Render loading state
  const renderLoading = () => (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-4 p-8 bg-white rounded-lg shadow-md">
      <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-neutral-800 animate-spin" />
      </div>
      <p className="text-neutral-600">Processing...</p>
      <div className="flex space-x-2">
        <div
          className="h-2 w-2 bg-neutral-800 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        ></div>
        <div
          className="h-2 w-2 bg-neutral-800 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        ></div>
        <div
          className="h-2 w-2 bg-neutral-800 rounded-full animate-bounce"
          style={{ animationDelay: "600ms" }}
        ></div>
      </div>
    </div>
  );

  // Render progress indicator
  const renderProgress = () => (
    <div className="w-full max-w-md mx-auto mb-6">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <div
                className={cn(
                  "h-[2px] w-16",
                  index <= step ? "bg-neutral-800" : "bg-neutral-300"
                )}
              />
            )}
            <div
              className={cn(
                "rounded-full flex items-center justify-center",
                index <= step
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-200 text-neutral-600 border border-neutral-300"
              )}
              style={{ width: "24px", height: "24px" }}
            >
              <span className="text-xs font-medium">{index + 1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render the current step
  const renderStep = () => {
    if (loading) {
      return renderLoading();
    }

    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderDreams();
      case 2:
        return renderInterests();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 flex flex-col items-center justify-center p-4">
      {renderProgress()}
      {renderStep()}
    </div>
  );
}
