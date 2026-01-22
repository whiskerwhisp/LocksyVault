"use client";

import React, { useState } from "react";
import { generatePassword, PasswordOptions } from "@/lib/password-generator";

const Home = () => {
    const [length, setLength] = useState(16);
    const [options, setOptions] = useState<PasswordOptions>({
        length: 16,
        lowercase: true,
        uppercase: true,
        numbers: true,
        symbols: true,
        excludeLookAlike: false,
    });
    const [generatedPassword, setGeneratedPassword] = useState("");

    const handleGenerate = () => {
        const password = generatePassword({ ...options, length });
        setGeneratedPassword(password);
    };

    const handleOptionChange = (option: keyof PasswordOptions) => {
        setOptions(prev => ({
            ...prev,
            [option]: !prev[option as keyof typeof prev]
        }));
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 md:p-6">
            <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="bg-[#1F2937] text-gray-200 flex items-center justify-between px-4 py-2">
                    <div className="flex space-x-2 md:space-x-3">
                        <span className="text-red-500">●</span>
                        <span className="text-yellow-500">●</span>
                        <span className="text-green-500">●</span>
                    </div>
                    <div className="hidden sm:flex space-x-4 text-sm">
                        <button className="hover:text-white">File</button>
                        <button className="hover:text-white">Edit</button>
                        <button className="hover:text-white">Special</button>
                    </div>
                </div>

                <div className="p-4 md:p-6">
                    <h1 className="text-lg md:text-xl font-bold text-center border-b pb-2 mb-4">The Password Generator</h1>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm md:text-base">
                            <span>Password Length:</span>
                            <span className="bg-[#E5E7EB] px-2 py-1 rounded">{length}</span>
                        </div>
                        <input 
                            type="range" 
                            min="8" 
                            max="64" 
                            value={length}
                            onChange={(e) => setLength(Number(e.target.value))}
                            className="w-full"
                        />

                        <label className="flex items-center justify-between text-sm md:text-base">
                            <span>Lowercase letters (a-z)</span>
                            <input 
                                type="checkbox" 
                                className="w-4 h-4"
                                checked={options.lowercase}
                                onChange={() => handleOptionChange('lowercase')}
                            />
                        </label>
                        <label className="flex items-center justify-between text-sm md:text-base">
                            <span>Uppercase letters (A-Z)</span>
                            <input 
                                type="checkbox" 
                                className="w-4 h-4"
                                checked={options.uppercase}
                                onChange={() => handleOptionChange('uppercase')}
                            />
                        </label>
                        <label className="flex items-center justify-between text-sm md:text-base">
                            <span>Numbers (0-9)</span>
                            <input 
                                type="checkbox" 
                                className="w-4 h-4"
                                checked={options.numbers}
                                onChange={() => handleOptionChange('numbers')}
                            />
                        </label>
                        <label className="flex items-center justify-between text-sm md:text-base">
                            <span>Special symbols</span>
                            <input 
                                type="checkbox" 
                                className="w-4 h-4"
                                checked={options.symbols}
                                onChange={() => handleOptionChange('symbols')}
                            />
                        </label>
                        <label className="flex items-center justify-between text-sm md:text-base">
                            <span>Exclude look-alike characters</span>
                            <input 
                                type="checkbox" 
                                className="w-4 h-4"
                                checked={options.excludeLookAlike}
                                onChange={() => handleOptionChange('excludeLookAlike')}
                            />
                        </label>
                    </div>
 <div className="flex justify-center mt-6">
                        <button 
                            onClick={handleGenerate}
                            className="border border-gray-300 rounded-lg px-4 py-2 hover:bg-[#E5E7EB]"
                        >
                            Generate
                        </button>
                    </div>
                    <div className="mt-6 pt-4 border-t">
                        <div className="mb-1 text-sm md:text-base">Generated Password</div>
                        <div className="bg-[#E5E7EB] rounded p-3 break-all text-gray-600 text-sm md:text-base">
                            {generatedPassword || "Click generate to create a password"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
                   
    )
}

export default Home;


