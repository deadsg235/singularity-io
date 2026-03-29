from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

router = APIRouter()

class Proposal(BaseModel):
    id: str
    title: str
    description: str
    proposer: str
    yes_votes: float = 0
    no_votes: float = 0
    total_votes: float = 0
    end_time: datetime
    status: str = "active"
    created_at: datetime

class VoteRequest(BaseModel):
    proposal_id: str
    wallet: str
    vote: bool  # True for yes, False for no
    amount: float

class CreateProposalRequest(BaseModel):
    title: str
    description: str
    wallet: str

# In-memory storage (replace with database in production)
proposals = {}
user_votes = {}  # {wallet: {proposal_id: {vote, amount}}}
user_voting_power = {}  # {wallet: voting_power}

# Initialize with some sample proposals
sample_proposals = [
    {
        "id": "prop_1",
        "title": "Reduce Trading Fees to 0.05%",
        "description": "Lower trading fees to increase volume and competitiveness",
        "proposer": "governance_council",
        "yes_votes": 12500000,
        "no_votes": 3200000,
        "total_votes": 15700000,
        "end_time": datetime.now() + timedelta(days=3),
        "status": "active",
        "created_at": datetime.now() - timedelta(days=4)
    },
    {
        "id": "prop_2", 
        "title": "Add Ethereum Bridge Support",
        "description": "Implement cross-chain bridge for ETH and ERC-20 tokens",
        "proposer": "dev_team",
        "yes_votes": 8900000,
        "no_votes": 6100000,
        "total_votes": 15000000,
        "end_time": datetime.now() + timedelta(days=5),
        "status": "active",
        "created_at": datetime.now() - timedelta(days=2)
    }
]

for prop in sample_proposals:
    proposals[prop["id"]] = Proposal(**prop)

@router.get("/api/governance/proposals")
async def get_proposals():
    """Get all governance proposals"""
    active_proposals = []
    
    for proposal in proposals.values():
        # Update status if voting period ended
        if proposal.end_time < datetime.now() and proposal.status == "active":
            if proposal.yes_votes > proposal.no_votes:
                proposal.status = "passed"
            else:
                proposal.status = "rejected"
        
        active_proposals.append({
            "id": proposal.id,
            "title": proposal.title,
            "description": proposal.description,
            "proposer": proposal.proposer,
            "yes_votes": proposal.yes_votes,
            "no_votes": proposal.no_votes,
            "total_votes": proposal.total_votes,
            "end_time": proposal.end_time.isoformat(),
            "status": proposal.status,
            "created_at": proposal.created_at.isoformat(),
            "yes_percentage": (proposal.yes_votes / proposal.total_votes * 100) if proposal.total_votes > 0 else 0,
            "no_percentage": (proposal.no_votes / proposal.total_votes * 100) if proposal.total_votes > 0 else 0
        })
    
    return {"proposals": active_proposals}

@router.get("/api/governance/user/{wallet}")
async def get_user_governance_info(wallet: str):
    """Get user's governance information"""
    # Calculate voting power based on staked tokens (mock calculation)
    staked_amount = 15000  # This would come from staking API
    total_supply = 25000000  # Circulating supply
    voting_power = (staked_amount / total_supply) * 100
    
    user_votes_list = []
    if wallet in user_votes:
        for proposal_id, vote_info in user_votes[wallet].items():
            if proposal_id in proposals:
                proposal = proposals[proposal_id]
                user_votes_list.append({
                    "proposal_id": proposal_id,
                    "proposal_title": proposal.title,
                    "vote": "Yes" if vote_info["vote"] else "No",
                    "amount": vote_info["amount"]
                })
    
    return {
        "sio_balance": staked_amount,
        "staked_amount": staked_amount * 0.8,
        "voting_power": voting_power,
        "votes_cast": user_votes_list
    }

@router.post("/api/governance/vote")
async def cast_vote(request: VoteRequest):
    """Cast a vote on a proposal"""
    if request.proposal_id not in proposals:
        raise HTTPException(404, "Proposal not found")
    
    proposal = proposals[request.proposal_id]
    
    if proposal.status != "active":
        raise HTTPException(400, "Voting period has ended")
    
    if proposal.end_time < datetime.now():
        raise HTTPException(400, "Voting period has expired")
    
    # Check if user already voted
    if request.wallet in user_votes and request.proposal_id in user_votes[request.wallet]:
        raise HTTPException(400, "Already voted on this proposal")
    
    # Record the vote
    if request.wallet not in user_votes:
        user_votes[request.wallet] = {}
    
    user_votes[request.wallet][request.proposal_id] = {
        "vote": request.vote,
        "amount": request.amount
    }
    
    # Update proposal vote counts
    if request.vote:
        proposal.yes_votes += request.amount
    else:
        proposal.no_votes += request.amount
    
    proposal.total_votes += request.amount
    
    return {
        "success": True,
        "message": f"Vote cast successfully: {'Yes' if request.vote else 'No'} with {request.amount} S-IO",
        "transaction_id": f"vote_{datetime.now().timestamp()}"
    }

@router.post("/api/governance/propose")
async def create_proposal(request: CreateProposalRequest):
    """Create a new governance proposal"""
    # Check if user has enough tokens to create proposal (minimum 1000 S-IO)
    min_tokens = 1000
    user_balance = 15000  # This would come from token balance API
    
    if user_balance < min_tokens:
        raise HTTPException(400, f"Minimum {min_tokens} S-IO required to create proposal")
    
    proposal_id = str(uuid.uuid4())
    
    new_proposal = Proposal(
        id=proposal_id,
        title=request.title,
        description=request.description,
        proposer=f"{request.wallet[:4]}...{request.wallet[-4:]}",
        end_time=datetime.now() + timedelta(days=7),
        created_at=datetime.now()
    )
    
    proposals[proposal_id] = new_proposal
    
    return {
        "success": True,
        "proposal_id": proposal_id,
        "message": "Proposal created successfully. Voting period: 7 days"
    }

@router.get("/api/governance/stats")
async def get_governance_stats():
    """Get governance statistics"""
    total_proposals = len(proposals)
    active_proposals = len([p for p in proposals.values() if p.status == "active"])
    passed_proposals = len([p for p in proposals.values() if p.status == "passed"])
    
    total_votes_cast = sum(p.total_votes for p in proposals.values())
    
    return {
        "total_proposals": total_proposals,
        "active_proposals": active_proposals,
        "passed_proposals": passed_proposals,
        "total_votes_cast": total_votes_cast,
        "participation_rate": 65.4  # Mock participation rate
    }