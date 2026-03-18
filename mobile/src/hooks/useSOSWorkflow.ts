import { useEffect } from 'react';

import { AppDispatch } from '../redux/store';
import { cancelSOSTrigger, tickSOSTrigger, triggerSOS } from '../redux/slices/sosSlice';
import { SOSWorkflowStatus } from '../types';

type Params = {
  dispatch: AppDispatch;
  workflowStatus: SOSWorkflowStatus;
  cancelSecondsLeft: number;
};

export const useSOSWorkflow = ({ dispatch, workflowStatus, cancelSecondsLeft }: Params) => {
  useEffect(() => {
    if (workflowStatus !== 'triggered') {
      return;
    }

    if (cancelSecondsLeft <= 0) {
      dispatch(triggerSOS());
      return;
    }

    const timeoutId = setTimeout(() => {
      dispatch(tickSOSTrigger());
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [cancelSecondsLeft, dispatch, workflowStatus]);

  const cancel = () => {
    dispatch(cancelSOSTrigger());
  };

  return { cancel };
};
