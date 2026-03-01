/**
 * TypeScript Quick Reference for JavaScript Developers
 * 
 * This file explains TypeScript concepts used in this project
 * It's just a reference - you don't need to run it
 */

// ============================================================
// 1. TYPE ANNOTATIONS
// ============================================================

// JavaScript - no types
const name = "John";
const age = 30;
const isActive = true;

// TypeScript - with type annotations
const nameTS: string = "John";
const ageTS: number = 30;
const isActiveTS: boolean = true;

// TypeScript can usually infer types, so you don't always need them
const inferredName = "John";  // TypeScript knows this is a string

// ============================================================
// 2. INTERFACES - Object Blueprints
// ============================================================

// An interface defines the shape of an object
interface User {
  id: string;
  name: string;
  age: number;
  email?: string;  // ? means optional
}

// Now TypeScript enforces this structure
const user: User = {
  id: "123",
  name: "John",
  age: 30,
  // email is optional, so we can skip it
};

// ============================================================
// 3. FUNCTION TYPE ANNOTATIONS
// ============================================================

// JavaScript function
function add(a, b) {
  return a + b;
}

// TypeScript function - specify parameter and return types
function addTS(a: number, b: number): number {
  return a + b;
}

// Arrow function with types
const multiply = (a: number, b: number): number => {
  return a * b;
};

// Async function with Promise return type
async function fetchData(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}

// ============================================================
// 4. UNION TYPES - Multiple Possible Types
// ============================================================

// A variable that can be string OR number
let id: string | number;
id = "abc";  // Valid
id = 123;    // Also valid

// Literal union types (only specific values allowed)
type Status = "pending" | "approved" | "rejected";
let orderStatus: Status = "pending";  // Valid
// orderStatus = "cancelled";  // Error! Not one of the allowed values

// ============================================================
// 5. GENERIC TYPES (Advanced)
// ============================================================

// Array of strings
const names: string[] = ["Alice", "Bob"];
// or: Array<string>

// Array of numbers
const numbers: number[] = [1, 2, 3];

// Object where values can be any type
const data: Record<string, any> = {
  name: "Alice",
  age: 30,
  active: true,
};

// ============================================================
// 6. UTILITY TYPES
// ============================================================

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

// Partial - makes all properties optional
type PartialProduct = Partial<Product>;
const partialProduct: PartialProduct = {
  name: "Widget",  // Only need to provide some properties
};

// Omit - removes specific properties
type ProductWithoutDescription = Omit<Product, "description">;
const product: ProductWithoutDescription = {
  id: "1",
  name: "Widget",
  price: 9.99,
  // description is not allowed
};

// Pick - includes only specific properties
type ProductSummary = Pick<Product, "id" | "name">;
const summary: ProductSummary = {
  id: "1",
  name: "Widget",
  // Only id and name are allowed
};

// ============================================================
// 7. TYPE ASSERTIONS
// ============================================================

// Tell TypeScript to treat something as a specific type
const input = document.getElementById("myInput") as HTMLInputElement;
// Now TypeScript knows input has .value property

// Alternative syntax (not used in JSX/TSX)
const input2 = <HTMLInputElement>document.getElementById("myInput");

// ============================================================
// 8. REACT + TYPESCRIPT
// ============================================================

// Typing component props
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
};

// Typing useState
import { useState } from 'react';

function Counter() {
  // TypeScript infers the type
  const [count, setCount] = useState(0);
  
  // Or explicitly specify it
  const [name, setName] = useState<string>("Alice");
  
  // For complex types
  const [user, setUser] = useState<User | null>(null);
  
  return <div>{count}</div>;
}

// ============================================================
// 9. ASYNC/AWAIT WITH TYPES
// ============================================================

// Promise that resolves to a string
async function loadData(): Promise<string> {
  return "data";
}

// Promise that resolves to a custom type
async function loadUser(): Promise<User> {
  const response = await fetch("/api/user");
  const data = await response.json();
  return data as User;  // Type assertion
}

// ============================================================
// 10. NULL/UNDEFINED HANDLING
// ============================================================

// Variable that might be null or undefined
let value: string | null = null;

// Optional chaining - safely access nested properties
const userEmail = user?.email;  // Returns undefined if user is null

// Nullish coalescing - provide default value
const displayName = user?.name ?? "Anonymous";

// Non-null assertion (use sparingly!)
const element = document.getElementById("app")!;  // ! says "I know this exists"

// ============================================================
// KEY DIFFERENCES FROM JAVASCRIPT
// ============================================================

/**
 * 1. TypeScript adds TYPE CHECKING at compile time
 *    - Catches bugs before you run the code
 *    - Better IDE autocomplete and hints
 * 
 * 2. All TypeScript gets COMPILED to JavaScript
 *    - Types are removed in the final output
 *    - The browser only sees JavaScript
 * 
 * 3. TypeScript is OPTIONAL
 *    - You can use "any" type to skip type checking
 *    - You can gradually adopt TypeScript in existing JS projects
 * 
 * 4. Better for LARGE PROJECTS
 *    - Easier to refactor
 *    - Clearer interfaces between modules
 *    - Self-documenting code
 */

// ============================================================
// COMMON PATTERNS IN THIS PROJECT
// ============================================================

/**
 * Pattern 1: Context with Types
 * See: src/contexts/BudgetContext.tsx
 */

// Create context with a specific type
// const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

/**
 * Pattern 2: Service Classes with Static Methods
 * See: src/services/fileStorage.ts
 */

// class FileStorageService {
//   static async saveBudget(data: BudgetData): Promise<void> {
//     // Implementation
//   }
// }

/**
 * Pattern 3: Props Interfaces
 * See: src/components/*.tsx
 */

// interface WelcomeScreenProps {
//   onCreateNew: () => void;
//   loading: boolean;
// }
// 
// const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onCreateNew, loading }) => {
//   // Component implementation
// };

// ============================================================
// HELPFUL TIPS
// ============================================================

/**
 * 1. Hover over variables in VS Code to see their types
 * 2. Use Cmd+Click (Mac) or Ctrl+Click (Windows) to jump to type definitions
 * 3. TypeScript errors show up with red squiggly lines
 * 4. "any" type disables all type checking - use sparingly
 * 5. When in doubt, let TypeScript infer the type
 */

export {};  // Makes this a module (required for TypeScript)
