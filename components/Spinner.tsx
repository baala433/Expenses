// FIX: Create and export a default Spinner component to resolve the module not found error.
import React from 'react';
import { SpinnerIcon } from './Icons';

const Spinner = () => {
    return (
        <div className="flex justify-center items-center">
            <SpinnerIcon className="w-12 h-12 text-blue-600" />
        </div>
    );
};

export default Spinner;
