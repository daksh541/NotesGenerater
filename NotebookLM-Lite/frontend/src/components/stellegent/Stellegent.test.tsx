/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { LandingHero } from './LandingHero';
import { StructuredNotesView } from './StructuredNotesView';
import { FlashcardDeck } from './FlashcardDeck';
import { DiagramWorkspace } from './DiagramWorkspace';
import { StudyAssistantChat } from './StudyAssistantChat';
import { StructuredNote, DiagramArtifact, Flashcard } from '../../types/stellegent';
import { stellegentApi } from '../../services/stellegentApi';

vi.mock('../../services/stellegentApi', () => ({
    stellegentApi: {
        updateNote: vi.fn(),
        regenerateDiagram: vi.fn(),
        updateFlashcard: vi.fn().mockResolvedValue({ id: 'fc_1', review_status: 'mastered' }),
        getStudyMessages: vi.fn().mockResolvedValue([

            {
                id: 'msg_1',
                workspace_id: 'ws_1',
                lecture_id: 'lec_1',
                user_id: 'u_1',
                role: 'assistant',
                content: 'Hello! I am grounded in your lecture notes.',
                citations: [],
                created_at: '2026-10-24T12:00:00Z'
            }
        ]),
        sendStudyChat: vi.fn().mockResolvedValue({
            id: 'msg_2',
            role: 'assistant',
            content: 'Backpropagation uses the chain rule to propagate error gradients backwards.',
            citations: [
                {
                    lecture_id: 'lec_1',
                    lecture_title: 'Neural Networks & Backpropagation',
                    page_number: 1,
                    snippet: 'dL/dw = dL/dy * dy/dw',
                    confidence: 0.95
                }
            ],
            created_at: '2026-10-24T12:00:01Z'
        }),
    }
}));


afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
});

const sampleNote: StructuredNote = {
    id: 'note_1',
    lecture_id: 'lec_1',
    title: 'Backpropagation & Neural Networks',
    summary: 'A mathematical and conceptual walkthrough of backpropagation in deep neural networks.',
    sections: [
        {
            heading: 'Core Derivation',
            content: 'Forward pass followed by backwards gradient propagation.',
            subsections: ['Forward evaluation', 'Chain rule expansion']
        }
    ],
    key_definitions: [
        { term: 'Gradient Descent', definition: 'Optimization algorithm that minimizes loss along the negative gradient.', context: 'Optimization' },
        { term: 'Chain Rule', definition: 'Calculus formula for computing derivatives of composite functions.', context: 'Calculus' }
    ],
    important_examples: ['Feedforward layer with sigmoid activation'],
    equations_and_formulas: [
        {
            latex_or_text: 'dL/dw = dL/dy * dy/dw',
            explanation: 'Gradient of loss with respect to weights.',
            variables: { 'L': 'Loss', 'w': 'Weight' }
        }
    ],
    step_by_step_explanations: [
        '1. Forward pass computes intermediate activations.',
        '2. Compute loss between target and prediction.',
        '3. Backward pass computes gradients via chain rule.'
    ],
    concept_relationships: [
        'Backpropagation relies on Chain Rule for computing weight updates.'
    ],
    key_takeaways: [
        'Backpropagation is reverse-mode autodiff applied to neural networks.'
    ],
    original_transcription: 'L = (y - y_hat)^2 / 2\nw_new = w_old - lr * dL/dw',
    ai_organized_notes: '1. Initialize weights\n2. Compute forward loss\n3. Propagate gradients',
    ai_added_explanations: 'Note: Sigmoid activation is often replaced by ReLU to mitigate vanishing gradients.',
    user_markdown_override: '',
    updated_at: '2026-10-24T12:00:00Z'
};

const sampleDiagram: DiagramArtifact = {
    id: 'diag_1',
    lecture_id: 'lec_1',
    diagram_type: 'flowchart',
    title: 'Backpropagation Data Flow',
    description: 'Process pipeline showing forward and backward propagation steps.',
    mermaid_code: 'graph TD\n  A[Forward Pass] --> B[Loss Computation]\n  B --> C[Backward Pass]',
    elements_json: {},
    is_valid_syntax: true,
    created_at: '2026-10-24T12:00:00Z',
    updated_at: '2026-10-24T12:00:00Z'
};

const sampleFlashcards: Flashcard[] = [
    {
        id: 'fc_1',
        lecture_id: 'lec_1',
        question_type: 'short_answer',
        question: 'What is the purpose of the backward pass in a neural network?',
        answer: 'To compute the gradients of the loss function with respect to all network weights using the chain rule.',
        explanation: 'Backpropagation distributes gradients backwards.',
        options: [],
        difficulty: 'medium',
        review_status: 'new',
        tags: ['neural_networks'],
        created_at: '2026-10-24T12:00:00Z'
    },
    {
        id: 'fc_2',
        lecture_id: 'lec_1',
        question_type: 'multiple_choice',
        question: 'Which rule of calculus enables gradient calculation through layers?',
        answer: 'Chain Rule',
        explanation: 'The chain rule computes composite derivatives.',
        options: ['Product Rule', 'Quotient Rule', 'Chain Rule', 'Power Rule'],
        correct_option_index: 2,
        difficulty: 'easy',
        review_status: 'new',
        tags: ['calculus'],
        created_at: '2026-10-24T12:00:00Z'
    }
];

describe('Stellegent Frontend Component Suite', () => {
    test('LandingHero renders title, tagline and action buttons', () => {
        const onGetStarted = vi.fn();
        const onExploreDemo = vi.fn();

        render(
            <LandingHero
                onGetStarted={onGetStarted}
                onExploreDemo={onExploreDemo}
            />
        );

        expect(screen.getByText('Stellegent')).toBeInTheDocument();
        expect(screen.getByText('Turn everyday knowledge into intelligence.')).toBeInTheDocument();

        const startBtn = screen.getByRole('button', { name: /Open My Workspace/i });
        expect(startBtn).toBeInTheDocument();
        fireEvent.click(startBtn);
        expect(onGetStarted).toHaveBeenCalled();

        const demoBtn = screen.getByRole('button', { name: /Try Sample Whiteboard/i });
        expect(demoBtn).toBeInTheDocument();
        fireEvent.click(demoBtn);
        expect(onExploreDemo).toHaveBeenCalled();
    });

    test('StructuredNotesView displays three-tier content and allows editing summary', async () => {
        const onNoteUpdated = vi.fn();
        const updatedMockNote = { ...sampleNote, summary: 'Updated user summary text.' };
        (stellegentApi.updateNote as any).mockResolvedValueOnce(updatedMockNote);

        render(
            <StructuredNotesView
                note={sampleNote}
                lectureId="lec_1"
                onNoteUpdated={onNoteUpdated}
            />
        );

        // Verify key elements
        expect(screen.getByText('Backpropagation & Neural Networks')).toBeInTheDocument();
        expect(screen.getByText('Gradient Descent')).toBeInTheDocument();
        expect(screen.getByText(/1\. Source Whiteboard Transcription/i)).toBeInTheDocument();
        expect(screen.getByText(/3\. AI-Added Explanations & Expanded Context/i)).toBeInTheDocument();

        // Click Edit Notes
        const editBtn = screen.getByRole('button', { name: /Edit Notes/i });
        fireEvent.click(editBtn);

        // Edit summary textarea
        const textarea = screen.getByDisplayValue(sampleNote.summary);
        fireEvent.change(textarea, { target: { value: 'Updated user summary text.' } });

        // Save
        const saveBtn = screen.getByRole('button', { name: /Save Notes/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(stellegentApi.updateNote).toHaveBeenCalledWith('lec_1', expect.objectContaining({
                summary: 'Updated user summary text.'
            }));
            expect(onNoteUpdated).toHaveBeenCalledWith(updatedMockNote);
        });
    });

    test('DiagramWorkspace allows switching between diagram visual view and mermaid code view', () => {
        const onDiagramUpdated = vi.fn();

        render(
            <DiagramWorkspace
                diagrams={[sampleDiagram]}
                lectureId="lec_1"
                onDiagramUpdated={onDiagramUpdated}
            />
        );

        expect(screen.getByText('Backpropagation Data Flow')).toBeInTheDocument();

        // Switch to Code Editor mode
        const codeTab = screen.getByRole('button', { name: /Mermaid Code/i });
        fireEvent.click(codeTab);

        expect(screen.getByDisplayValue(/graph TD/)).toBeInTheDocument();
    });

    test('FlashcardDeck allows card flipping and tracking review status', async () => {
        const onCardUpdated = vi.fn();

        render(
            <FlashcardDeck
                cards={sampleFlashcards}
                onCardUpdated={onCardUpdated}
            />
        );

        expect(screen.getByText(/What is the purpose of the backward pass/)).toBeInTheDocument();
        expect(screen.queryByText(/To compute the gradients of the loss function/)).not.toBeInTheDocument();

        // Click card to reveal answer
        const cardQuestion = screen.getByText(/What is the purpose of the backward pass/);
        fireEvent.click(cardQuestion);

        expect(screen.getByText(/To compute the gradients of the loss function/)).toBeInTheDocument();

        // Mark as Mastered
        const masterBtn = screen.getByRole('button', { name: /Mark Mastered/i });
        fireEvent.click(masterBtn);

        await waitFor(() => {
            expect(stellegentApi.updateFlashcard).toHaveBeenCalledWith('fc_1', { review_status: 'mastered' });
        });
    });


    test('StudyAssistantChat sends query and invokes API with citations', async () => {
        const onCitationClick = vi.fn();

        render(
            <StudyAssistantChat
                lectureId="lec_1"
                lectureTitle="Neural Networks & Backpropagation"
                onOpenCitation={onCitationClick}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/Hello! I am grounded in your lecture notes/)).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText(/Ask about equations, teacher definitions/i);
        fireEvent.change(input, { target: { value: 'Explain the chain rule' } });

        const submitBtn = input.closest('form')?.querySelector('button[type="submit"]') as HTMLElement;
        expect(submitBtn).toBeInTheDocument();
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(stellegentApi.sendStudyChat).toHaveBeenCalledWith('Explain the chain rule', 'lec_1');
        });
    });
});


