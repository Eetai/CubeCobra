import React from 'react';
import { useAnimations } from '../contexts/AnimationContext';

const DraftHeader: React.FC = () => {
	// Contains the animation toggle and any header controls
	const { animationsEnabled, toggleAnimations } = useAnimations();
	return (
		<div className="flex justify-end mt-2 mb-4">
			<div className="flex items-center">
				<input
					type="checkbox"
					id="toggle-animations"
					checked={!animationsEnabled}
					onChange={toggleAnimations}
					className="mr-2"
				/>
				<label htmlFor="toggle-animations" className="text-text text-sm cursor-pointer">
					Turn off animations
				</label>
			</div>
		</div>
	);
};

export default DraftHeader;
